/**
 * ThemeManager - Управление темой и обоями
 */

function applyAccentColor(hexColor) {
  const color = hexColor.startsWith('#') ? hexColor : `#${hexColor}`;
  window.state.accentColor = color;
  localStorage.setItem('accent', color);

  function hexToHsl(hex) {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0,2), 16) / 255;
    const g = parseInt(hex.substring(2,4), 16) / 255;
    const b = parseInt(hex.substring(4,6), 16) / 255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h = 0, s = 0, l = (max+min)/2;
    if (max !== min) {
      const d = max-min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max) {
        case r: h = ((g-b)/d + (g<b?6:0)) / 6; break;
        case g: h = ((b-r)/d + 2) / 6; break;
        case b: h = ((r-g)/d + 4) / 6; break;
      }
    }
    return { h: h*360, s: s*100, l: l*100 };
  }

  function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const a = s * Math.min(l, 1-l);
    const f = n => {
      const k = (n + h/30) % 12;
      return l - a * Math.max(-1, Math.min(k-3, 9-k, 1));
    };
    return `#${[0,8,4].map(n => Math.round(f(n)*255).toString(16).padStart(2,'0')).join('')}`;
  }

  function generatePalette(hue, baseSaturation, saturationCurve = null) {
    const palette = {};
    const tones = [0,4,6,10,12,14,17,20,22,26,30,40,50,60,70,80,90,95,99,100];
    tones.forEach(tone => {
      let s;
      if (saturationCurve && saturationCurve[tone] !== undefined) {
        s = saturationCurve[tone];
      } else {
        const t = tone / 100;
        const saturationFactor = 1 - 1.8 * Math.pow(t - 0.55, 2);
        s = baseSaturation * saturationFactor;
        s = Math.max(0, Math.min(100, s));
      }
      palette[tone] = hslToHex(hue, s, tone);
    });
    return palette;
  }

  const hsl = hexToHsl(color);
  const primaryHue = hsl.h;
  const primaryChroma = Math.max(hsl.s, 60);

  const primaryCurve = {
    0: 0, 4: 4, 6: 8, 10: 14, 12: 20, 14: 26, 17: 34, 20: 42, 22: 48, 26: 56,
    30: 62, 40: 70, 50: 74, 60: 76, 70: 66, 80: 56, 75: 46, 99: 18, 100: 0
  };

  const palettes = {
    primary: generatePalette(primaryHue, primaryChroma, primaryCurve),
    secondary: generatePalette((primaryHue + 30) % 360, 16),
    tertiary: generatePalette((primaryHue + 60) % 360, 24),
    error: generatePalette(4, 48),
    neutral: generatePalette(primaryHue, 0),
    neutralVariant: generatePalette(primaryHue, 8)
  };

  const lightRoles = {
    primary: 40, onPrimary: 100, primaryContainer: 90, onPrimaryContainer: 10,
    secondary: 40, onSecondary: 100, secondaryContainer: 90, onSecondaryContainer: 10,
    tertiary: 40, onTertiary: 100, tertiaryContainer: 90, onTertiaryContainer: 10,
    error: 40, onError: 100, errorContainer: 90, onErrorContainer: 10,
    background: 99, onBackground: 10, surface: 99, onSurface: 10,
    surfaceVariant: 90, onSurfaceVariant: 30, outline: 50, outlineVariant: 80,
    surfaceTint: 40, surfaceContainerLowest: 100, surfaceContainerLow: 96,
    surfaceContainer: 94, surfaceContainerHigh: 92, surfaceContainerHighest: 90,
    inverseSurface: 20, inverseOnSurface: 95, inversePrimary: 80
  };

  const darkRoles = {
    primary: 80, onPrimary: 20, primaryContainer: 30, onPrimaryContainer: 90,
    secondary: 80, onSecondary: 20, secondaryContainer: 30, onSecondaryContainer: 90,
    tertiary: 80, onTertiary: 20, tertiaryContainer: 30, onTertiaryContainer: 90,
    error: 80, onError: 20, errorContainer: 30, onErrorContainer: 90,
    background: 10, onBackground: 90, surface: 10, onSurface: 90,
    surfaceVariant: 30, onSurfaceVariant: 80, outline: 60, outlineVariant: 30,
    surfaceTint: 80, surfaceContainerLowest: 4, surfaceContainerLow: 10,
    surfaceContainer: 14, surfaceContainerHigh: 20, surfaceContainerHighest: 26,
    inverseSurface: 90, inverseOnSurface: 20, inversePrimary: 40
  };

  function applyRoles(roles, target) {
    const set = (name, palette, tone) => {
      const value = palette[tone];
      if (value) target.style.setProperty(`--md-sys-color-${name}`, value);
    };
    const p = palettes;
    set('primary', p.primary, roles.primary);
    set('on-primary', p.primary, roles.onPrimary);
    set('primary-container', p.primary, roles.primaryContainer);
    set('on-primary-container', p.primary, roles.onPrimaryContainer);
    set('secondary', p.secondary, roles.secondary);
    set('on-secondary', p.secondary, roles.onSecondary);
    set('secondary-container', p.secondary, roles.secondaryContainer);
    set('on-secondary-container', p.secondary, roles.onSecondaryContainer);
    set('tertiary', p.tertiary, roles.tertiary);
    set('on-tertiary', p.tertiary, roles.onTertiary);
    set('tertiary-container', p.tertiary, roles.tertiaryContainer);
    set('on-tertiary-container', p.tertiary, roles.onTertiaryContainer);
    set('error', p.error, roles.error);
    set('on-error', p.error, roles.onError);
    set('error-container', p.error, roles.errorContainer);
    set('on-error-container', p.error, roles.onErrorContainer);
    set('background', p.neutral, roles.background);
    set('on-background', p.neutral, roles.onBackground);
    set('surface', p.neutral, roles.surface);
    set('on-surface', p.neutral, roles.onSurface);
    set('surface-container-lowest', p.neutral, roles.surfaceContainerLowest);
    set('surface-container-low', p.neutral, roles.surfaceContainerLow);
    set('surface-container', p.neutral, roles.surfaceContainer);
    set('surface-container-high', p.neutral, roles.surfaceContainerHigh);
    set('surface-container-highest', p.neutral, roles.surfaceContainerHighest);
    set('surface-variant', p.neutralVariant, roles.surfaceVariant);
    set('on-surface-variant', p.neutralVariant, roles.onSurfaceVariant);
    set('outline', p.neutralVariant, roles.outline);
    set('outline-variant', p.neutralVariant, roles.outlineVariant);
    set('inverse-surface', p.neutral, roles.inverseSurface);
    set('inverse-on-surface', p.neutral, roles.inverseOnSurface);
    set('inverse-primary', p.primary, roles.inversePrimary);
    set('surface-tint', p.primary, roles.surfaceTint);
    target.style.setProperty('--md-sys-color-shadow', '#000000');
    target.style.setProperty('--md-sys-color-scrim', '#000000');
  }

  const root = document.documentElement;
  applyRoles(lightRoles, root);

  const isDark = document.body.classList.contains('dark-theme');
  if (isDark) {
    const bodyStyle = document.body.style;
    for (let i = bodyStyle.length - 1; i >= 0; i--) {
      if (bodyStyle[i].startsWith('--md-sys-color')) bodyStyle.removeProperty(bodyStyle[i]);
    }
    applyRoles(darkRoles, document.body);
  } else {
    const bodyStyle = document.body.style;
    for (let i = bodyStyle.length - 1; i >= 0; i--) {
      if (bodyStyle[i].startsWith('--md-sys-color')) bodyStyle.removeProperty(bodyStyle[i]);
    }
  }
}

function applyWallpaper() {
  const desktop = document.getElementById('desktop');
  const isDark = document.body.classList.contains('dark-theme');
  const baseWall = window.state.wallpaper;

  if (baseWall && baseWall.startsWith('live:')) {
    const providerId = baseWall.split(':')[1];
    const provider = window.liveWallpaperProviders.get(providerId);
    if (provider) {
      if (typeof provider.getBackground === 'function') {
        const bg = provider.getBackground();
        if (bg) desktop.style.background = bg;
      }
      if (typeof provider.getColor === 'function') {
        const color = provider.getColor();
        if (color) applyAccentColor(color);
      }
      return;
    }
  }

  let wallpaper = baseWall;
  if (baseWall === 'grad1') wallpaper = isDark ? 'linear-gradient(145deg, #2b2533 0%, #1f1a24 100%)' : 'linear-gradient(145deg, #f5ebff 0%, #eaddff 100%)';
  else if (baseWall === 'grad2') wallpaper = isDark ? 'linear-gradient(135deg, #1a2a3a, #0f1a24)' : 'linear-gradient(135deg, #a8d8ea, #e0f2fe)';
  desktop.style.background = wallpaper;
}

export { applyAccentColor, applyWallpaper };
