/**
 * FrameManager - Manages the SVG frame with inverted fill
 * Implements path generation, corner rounding, and panel merging algorithms from Caelestia
 */

export class FrameManager {
  constructor(storageManager) {
    this.storage = storageManager;
    this.canvas = null;
    this.strokePath = null;
    this.maskPath = null;
    this.outerFill = null;
    
    // Frame configuration
    this.padding = {
      top: 16,
      right: 16,
      bottom: 16,
      left: 64  // Left bar width
    };
    
    this.cornerRadius = this.storage.get('frameCornerRadius', 24);
    this.mergeThreshold = 20;
    
    // Panel data for frame deformation
    this.panels = new Map();
    
    // Animation state
    this.animationFrame = null;
    this.isAnimating = false;
  }

  /**
   * Initialize the frame manager
   */
  async init() {
    this.canvas = document.getElementById('frameCanvas');
    this.strokePath = document.getElementById('frameStrokePath');
    this.maskPath = document.getElementById('framePathMask');
    this.outerFill = document.getElementById('frameOuterFill');

    if (!this.canvas || !this.strokePath || !this.maskPath) {
      console.error('Frame elements not found in DOM');
      return;
    }

    // Apply initial theme
    const theme = this.storage.get('theme', 'dark');
    if (this.outerFill) {
      this.outerFill.setAttribute('fill', theme === 'dark' ? '#000000' : '#FFFFFF');
    }

    // Initial render
    this.update();

    // Start animation loop
    this._startAnimation();

    // Handle resize
    window.addEventListener('resize', () => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => this.update(), 150);
    });

    console.log('FrameManager initialized');
  }

  /**
   * Register a panel for frame deformation
   */
  registerPanel(panelConfig) {
    const panel = {
      id: panelConfig.id,
      side: panelConfig.side, // 'top', 'right', 'bottom', 'left'
      position: panelConfig.position || 0.5, // 0-1 along the edge
      size: panelConfig.size || 0.2, // 0-1 fraction of edge length
      maxDepth: panelConfig.maxDepth || 200,
      depth: 0,
      target: 0,
      animStart: null,
      animFrom: 0
    };
    
    this.panels.set(panel.id, panel);
    this.update();
    return panel;
  }

  /**
   * Unregister a panel
   */
  unregisterPanel(id) {
    this.panels.delete(id);
    this.update();
  }

  /**
   * Open a panel (animate depth)
   */
  openPanel(id) {
    const panel = this.panels.get(id);
    if (!panel || panel.target === panel.maxDepth) return;
    
    panel.animFrom = panel.depth;
    panel.animStart = performance.now();
    panel.target = panel.maxDepth;
  }

  /**
   * Close a panel
   */
  closePanel(id, immediate = false) {
    const panel = this.panels.get(id);
    if (!panel || panel.target === 0) return;
    
    if (immediate) {
      panel.depth = 0;
      panel.target = 0;
      panel.animStart = null;
      this.update();
    } else {
      panel.animFrom = panel.depth;
      panel.animStart = performance.now();
      panel.target = 0;
    }
  }

  /**
   * Toggle panel open/closed
   */
  togglePanel(id) {
    const panel = this.panels.get(id);
    if (!panel) return;
    
    if (panel.target === panel.maxDepth) {
      this.closePanel(id);
    } else {
      this.openPanel(id);
    }
  }

  /**
   * Set panel trigger mode (hover, edge, icon)
   */
  setPanelTrigger(id, trigger) {
    const panel = this.panels.get(id);
    if (panel) {
      panel.trigger = trigger;
    }
  }

  /**
   * Update frame geometry
   */
  update() {
    const rawPoints = this._buildRawPathPoints();
    
    // Step 1: Merge right angles
    let points = this._mergeRightAngles(rawPoints, this.mergeThreshold);
    
    // Step 2: Merge close parallel lines
    const merged = this._mergeCloseLines(points, this.mergeThreshold);
    points = merged.points.length >= 3 ? merged.points : rawPoints;
    
    // Step 3: Round corners
    const rounded = this._roundCorners(points, this.cornerRadius);
    
    // Convert to SVG path
    const pathStr = this._pointsToSVGPath(rounded, true);
    
    // Apply to SVG elements
    if (this.strokePath) {
      this.strokePath.setAttribute('d', pathStr);
    }
    if (this.maskPath) {
      this.maskPath.setAttribute('d', pathStr);
    }
  }

  /**
   * Build raw path points including panel cutouts
   */
  _buildRawPathPoints() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const { top, right, bottom, left } = this.padding;
    
    const x0 = left;
    const y0 = top;
    const x1 = w - right;
    const y1 = h - bottom;
    
    // Group panels by side
    const bySide = { top: [], bottom: [], left: [], right: [] };
    this.panels.forEach(panel => {
      if (panel.depth > 0.5) {
        bySide[panel.side].push(panel);
      }
    });
    
    // Sort panels by position on each side
    Object.keys(bySide).forEach(side => {
      bySide[side].sort((a, b) => a.position - b.position);
    });
    
    const points = [];
    
    const addLine = (ax, ay, bx, by) => {
      points.push({ x: ax, y: ay }, { x: bx, y: by });
    };
    
    const addCutout = (sx, sy, ex, ey, depth, normal) => {
      if (depth < 0.5) {
        points.push({ x: sx, y: sy }, { x: ex, y: ey });
        return;
      }
      points.push(
        { x: sx, y: sy },
        { x: sx + normal.x * depth, y: sy + normal.y * depth },
        { x: ex + normal.x * depth, y: ey + normal.y * depth },
        { x: ex, y: ey }
      );
    };
    
    // Define edges
    const edges = [
      { sx: x0, sy: y0, ex: x1, ey: y0, side: 'top', normal: { x: 0, y: 1 } },
      { sx: x1, sy: y0, ex: x1, ey: y1, side: 'right', normal: { x: -1, y: 0 } },
      { sx: x1, sy: y1, ex: x0, ey: y1, side: 'bottom', normal: { x: 0, y: -1 } },
      { sx: x0, sy: y1, ex: x0, ey: y0, side: 'left', normal: { x: 1, y: 0 } }
    ];
    
    for (const edge of edges) {
      const list = bySide[edge.side];
      const len = this._dist({ x: edge.sx, y: edge.sy }, { x: edge.ex, y: edge.ey });
      
      if (!list.length) {
        addLine(edge.sx, edge.sy, edge.ex, edge.ey);
        continue;
      }
      
      const dir = this._normalize({ x: edge.ex - edge.sx, y: edge.ey - edge.sy });
      let cur = 0;
      
      for (const panel of list) {
        const ps = panel.position - panel.size / 2;
        const pe = panel.position + panel.size / 2;
        
        if (ps > cur + 0.0001) {
          addLine(
            edge.sx + dir.x * cur * len,
            edge.sy + dir.y * cur * len,
            edge.sx + dir.x * ps * len,
            edge.sy + dir.y * ps * len
          );
        }
        
        addCutout(
          edge.sx + dir.x * ps * len,
          edge.sy + dir.y * ps * len,
          edge.sx + dir.x * pe * len,
          edge.sy + dir.y * pe * len,
          panel.depth,
          edge.normal
        );
        
        cur = pe;
      }
      
      if (cur < 1 - 0.0001) {
        addLine(
          edge.sx + dir.x * cur * len,
          edge.sy + dir.y * cur * len,
          edge.ex,
          edge.ey
        );
      }
    }
    
    // Remove duplicate consecutive points
    const result = [];
    for (const pt of points) {
      if (!result.length || 
          Math.abs(result[result.length - 1].x - pt.x) > 0.01 || 
          Math.abs(result[result.length - 1].y - pt.y) > 0.01) {
        result.push(pt);
      }
    }
    
    // Close the path if needed
    if (result.length > 1 && 
        Math.abs(result[0].x - result[result.length - 1].x) < 0.01 && 
        Math.abs(result[0].y - result[result.length - 1].y) < 0.01) {
      result.pop();
    }
    
    return result;
  }

  /**
   * Merge close parallel lines
   */
  _mergeCloseLines(points, threshold) {
    if (points.length < 4 || threshold <= 0) {
      return { points: [...points], mergeEvents: [] };
    }
    
    // Simplified implementation - full algorithm from Caelestia
    return { points: [...points], mergeEvents: [] };
  }

  /**
   * Merge right angles into single points
   */
  _mergeRightAngles(points, threshold) {
    if (points.length < 4 || threshold <= 0) {
      return [...points];
    }
    
    const n = points.length;
    const result = [];
    const merged = new Array(n).fill(false);
    
    for (let i = 0; i < n; i++) {
      if (merged[i]) continue;
      
      const curr = points[i];
      const prev = points[(i - 1 + n) % n];
      const next = points[(i + 1) % n];
      
      // Check for ~90° angle
      const v1 = this._normalize(this._sub(prev, curr));
      const v2 = this._normalize(this._sub(next, curr));
      const dot = this._dot(v1, v2);
      const angle = Math.acos(this._clamp(dot, -1, 1));
      
      if (Math.abs(angle - Math.PI / 2) > 0.1 && Math.abs(angle - 3 * Math.PI / 2) > 0.1) {
        result.push(curr);
        continue;
      }
      
      // Look for nearby 90° angles to merge
      let found = false;
      for (let j = i + 1; j < n; j++) {
        if (merged[j]) continue;
        
        const other = points[j];
        const d = this._dist(curr, other);
        
        if (d < threshold) {
          const mid = { x: (curr.x + other.x) / 2, y: (curr.y + other.y) / 2 };
          result.push(mid);
          merged[i] = merged[j] = true;
          found = true;
          break;
        }
      }
      
      if (!found) {
        result.push(curr);
      }
    }
    
    if (result.length < 3) {
      return [...points];
    }
    
    // Close path if needed
    const first = result[0];
    const last = result[result.length - 1];
    if (this._dist(first, last) > 0.5) {
      result.push({ x: first.x, y: first.y });
    }
    
    return result;
  }

  /**
   * Round corners of the path
   */
  _roundCorners(points, radius) {
    if (points.length < 3 || radius <= 0.5) {
      return [...points];
    }
    
    const n = points.length;
    const result = [];
    
    for (let i = 0; i < n; i++) {
      const prev = points[(i - 1 + n) % n];
      const curr = points[i];
      const next = points[(i + 1) % n];
      
      const vIn = this._normalize(this._sub(prev, curr));
      const vOut = this._normalize(this._sub(next, curr));
      
      const inLen = this._dist(prev, curr);
      const outLen = this._dist(curr, next);
      
      if (inLen < 0.5 || outLen < 0.5) {
        result.push({ x: curr.x, y: curr.y });
        continue;
      }
      
      const dotProd = this._clamp(this._dot(vIn, vOut), -1, 1);
      const angle = Math.acos(dotProd);
      
      if (angle < 0.02 || Math.abs(angle - Math.PI) < 0.02) {
        result.push({ x: curr.x, y: curr.y });
        continue;
      }
      
      const tanHalf = Math.tan(angle / 2);
      let d = radius / tanHalf;
      d = Math.min(d, inLen * 0.48, outLen * 0.48);
      
      if (d < 0.3) {
        result.push({ x: curr.x, y: curr.y });
        continue;
      }
      
      const pStart = this._add(curr, this._scale(vIn, d));
      const pEnd = this._add(curr, this._scale(vOut, d));
      const sweep = this._cross2D(vIn, vOut) > 0 ? 0 : 1;
      
      result.push({ x: pStart.x, y: pStart.y });
      result.push({ 
        x: pEnd.x, 
        y: pEnd.y, 
        isArc: true, 
        rx: d * tanHalf, 
        ry: d * tanHalf, 
        sweepFlag: sweep 
      });
    }
    
    return result;
  }

  /**
   * Convert points to SVG path string
   */
  _pointsToSVGPath(points, close = true) {
    if (!points.length) return '';
    
    let d = '';
    let first = null;
    let isFirst = true;
    
    for (const pt of points) {
      if (pt.isArc) {
        d += ` A ${pt.rx.toFixed(3)} ${pt.ry.toFixed(3)} 0 0 ${pt.sweepFlag} ${pt.x.toFixed(3)} ${pt.y.toFixed(3)}`;
        continue;
      }
      
      if (isFirst) {
        d += `M ${pt.x.toFixed(3)} ${pt.y.toFixed(3)}`;
        first = pt;
        isFirst = false;
      } else {
        d += ` L ${pt.x.toFixed(3)} ${pt.y.toFixed(3)}`;
      }
    }
    
    if (close && points.length > 2 && first) {
      const last = points[points.length - 1];
      if (!last.isArc || 
          Math.abs(last.x - first.x) > 0.01 || 
          Math.abs(last.y - first.y) > 0.01) {
        d += ' Z';
      }
    }
    
    return d;
  }

  /**
   * Animation loop for smooth panel transitions
   */
  _animStep(now) {
    let changed = false;
    
    this.panels.forEach(panel => {
      if (panel.target !== panel.depth) {
        if (panel.animStart === null) {
          panel.animStart = now;
          panel.animFrom = panel.depth;
        }
        
        const t = Math.min((now - panel.animStart) / 400, 1.0);
        // Spring easing
        const eased = t < 0.5 
          ? 4 * t * t * t 
          : 1 - Math.pow(-2 * t + 2, 3) / 2;
        
        panel.depth = panel.animFrom + (panel.target - panel.animFrom) * eased;
        
        if (t >= 1.0) {
          panel.depth = panel.target;
          panel.animStart = null;
        }
        
        changed = true;
      } else {
        panel.animStart = null;
      }
    });
    
    if (changed) {
      this.update();
    }
    
    this.animationFrame = requestAnimationFrame(() => this._animStep(performance.now()));
  }

  /**
   * Start animation loop
   */
  _startAnimation() {
    if (this.animationFrame) return;
    this.animationFrame = requestAnimationFrame(() => this._animStep(performance.now()));
  }

  // Utility functions
  _dist(p1, p2) {
    return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
  }

  _dot(p1, p2) {
    return p1.x * p2.x + p1.y * p2.y;
  }

  _cross2D(a, b) {
    return a.x * b.y - a.y * b.x;
  }

  _normalize(v) {
    const l = Math.sqrt(v.x * v.x + v.y * v.y);
    return l < 1e-9 ? { x: 0, y: 0 } : { x: v.x / l, y: v.y / l };
  }

  _sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y };
  }

  _add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y };
  }

  _scale(v, s) {
    return { x: v.x * s, y: v.y * s };
  }

  _clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  /**
   * Set corner radius
   */
  setCornerRadius(radius) {
    this.cornerRadius = radius;
    this.storage.set('frameCornerRadius', radius);
    this.update();
  }

  /**
   * Get current corner radius
   */
  getCornerRadius() {
    return this.cornerRadius;
  }
}
