// Configurações
const CONFIG = {
  colorsCount: 5,
  animations: true
};

// Elementos DOM
const paletteContainer = document.getElementById('palette');
const notification = document.getElementById('notification');

// Estado da aplicação
let state = {
  palette: [],
  history: {
    undo: [],
    redo: []
  },
  settings: {
    gradient: false,
    lockedColors: []
  }
};

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  generatePalette();
  
  // Atalho de teclado
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      generatePalette();
    }
  });
});

// Gerar nova paleta
function generatePalette() {
  // Salvar no histórico
  if (state.palette.length > 0) {
    state.history.undo.push([...state.palette]);
    state.history.redo = [];
  }

  const newPalette = [];
  const lockedColors = state.settings.lockedColors;

  if (state.settings.gradient) {
    // Gerar paleta gradiente
    const startColor = lockedColors[0] || generateRandomColor();
    const endColor = generateRandomColor();
    const gradientColors = generateGradient(startColor, endColor, CONFIG.colorsCount);
    
    for (let i = 0; i < CONFIG.colorsCount; i++) {
      newPalette.push({
        hex: gradientColors[i],
        locked: !!lockedColors[i]
      });
    }
  } else {
    // Gerar paleta aleatória
    for (let i = 0; i < CONFIG.colorsCount; i++) {
      if (lockedColors[i]) {
        newPalette.push({
          hex: lockedColors[i],
          locked: true
        });
      } else {
        let color;
        do {
          color = generateRandomColor();
        } while (newPalette.some(c => c.hex === color));
        
        newPalette.push({
          hex: color,
          locked: false
        });
      }
    }
  }

  state.palette = newPalette;
  renderPalette();
}

// Renderizar paleta
function renderPalette() {
  paletteContainer.innerHTML = '';
  
  state.palette.forEach((color, index) => {
    const colorCard = document.createElement('div');
    colorCard.className = 'color-card';
    colorCard.style.backgroundColor = color.hex;
    colorCard.style.animationDelay = `${index * 0.1}s`;
    
    // Valor HEX
    const colorValue = document.createElement('div');
    colorValue.className = 'color-value';
    colorValue.textContent = color.hex.toUpperCase();
    colorValue.style.color = getContrastColor(color.hex);
    
    // Ícone de bloqueio
    const lockIcon = document.createElement('div');
    lockIcon.className = 'lock-icon';
    lockIcon.innerHTML = color.locked ? '<i class="fas fa-lock"></i>' : '<i class="fas fa-lock-open"></i>';
    lockIcon.style.color = getContrastColor(color.hex);
    
    // Eventos
    colorCard.addEventListener('click', (e) => {
      if (e.shiftKey) {
        toggleLockColor(index);
      } else {
        copyToClipboard(color.hex);
      }
    });
    
    colorCard.appendChild(colorValue);
    colorCard.appendChild(lockIcon);
    paletteContainer.appendChild(colorCard);
  });
}

// Funções auxiliares
function generateRandomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
}

function generateGradient(startColor, endColor, steps) {
  const start = hexToRgb(startColor);
  const end = hexToRgb(endColor);
  const colors = [];
  
  for (let i = 0; i < steps; i++) {
    const r = Math.round(start.r + (end.r - start.r) * i / (steps - 1));
    const g = Math.round(start.g + (end.g - start.g) * i / (steps - 1));
    const b = Math.round(start.b + (end.b - start.b) * i / (steps - 1));
    colors.push(rgbToHex(r, g, b));
  }
  
  return colors;
}

function hexToRgb(hex) {
  const bigint = parseInt(hex.slice(1), 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
}

function getContrastColor(hex) {
  const rgb = hexToRgb(hex);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 150 ? '#333' : '#fff';
}

// Controles
function toggleGradient() {
  state.settings.gradient = !state.settings.gradient;
  document.getElementById('gradient-status').textContent = 
    state.settings.gradient ? 'ON' : 'OFF';
  generatePalette();
}

function toggleLockColor(index) {
  state.palette[index].locked = !state.palette[index].locked;
  state.settings.lockedColors[index] = state.palette[index].locked ? state.palette[index].hex : null;
  renderPalette();
}

function undo() {
  if (state.history.undo.length > 0) {
    state.history.redo.push([...state.palette]);
    state.palette = state.history.undo.pop();
    renderPalette();
    showNotification('Ação desfeita');
  }
}

function redo() {
  if (state.history.redo.length > 0) {
    state.history.undo.push([...state.palette]);
    state.palette = state.history.redo.pop();
    renderPalette();
    showNotification('Ação refeita');
  }
}

function exportPalette() {
  const data = {
    palette: state.palette,
    metadata: {
      generatedAt: new Date().toISOString(),
      generator: "ChromaGen"
    }
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `chromagen-palette-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showNotification('Paleta exportada!');
}

function importPalette(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.palette && Array.isArray(data.palette)) {
        state.history.undo.push([...state.palette]);
        state.palette = data.palette;
        state.settings.lockedColors = data.palette.map(c => c.locked ? c.hex : null);
        renderPalette();
        showNotification('Paleta importada!');
      } else {
        throw new Error('Formato inválido');
      }
    } catch (error) {
      showNotification('Erro ao importar', true);
    }
  };
  reader.readAsText(file);
}

// Utilitários
function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
  showNotification(`Copiado: ${text}`);
}

function showNotification(message, isError = false) {
  notification.textContent = message;
  notification.style.background = isError ? '#ff6b6b' : '#6e57e0';
  
  notification.classList.add('show');
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}