// --- Keyboard and Mouse Input Handler ---

class InputHandler {
  constructor() {
    this.keys = {};
    this.mouse = { x: 0, y: 0, isDown: false, moved: false };
    
    // Bind event handlers using physical e.code to bypass Korean IME language layout blocks
    window.addEventListener('keydown', (e) => {
      const code = e.code;
      
      if (code === 'KeyW' || code === 'ArrowUp') this.keys['w'] = true;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys['s'] = true;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys['a'] = true;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys['d'] = true;
      
      // Support French AZERTY keyboards
      if (code === 'KeyZ') this.keys['w'] = true;
      if (code === 'KeyQ') this.keys['a'] = true;
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code;
      
      if (code === 'KeyW' || code === 'ArrowUp') this.keys['w'] = false;
      if (code === 'KeyS' || code === 'ArrowDown') this.keys['s'] = false;
      if (code === 'KeyA' || code === 'ArrowLeft') this.keys['a'] = false;
      if (code === 'KeyD' || code === 'ArrowRight') this.keys['d'] = false;
      
      if (code === 'KeyZ') this.keys['w'] = false;
      if (code === 'KeyQ') this.keys['a'] = false;
    });
  }

  // Bind mouse move relative to Canvas element
  initCanvas(canvas) {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      // Calculate mouse coordinates in actual canvas coordinate system
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
      this.mouse.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
      this.mouse.moved = true;
    });

    canvas.addEventListener('mousedown', () => {
      this.mouse.isDown = true;
    });

    canvas.addEventListener('mouseup', () => {
      this.mouse.isDown = false;
    });
  }

  getMovementVector() {
    let dx = 0;
    let dy = 0;

    if (this.keys['w'] || this.keys['z']) dy -= 1;
    if (this.keys['s']) dy += 1;
    if (this.keys['a'] || this.keys['q']) dx -= 1;
    if (this.keys['d']) dx += 1;

    // Normalize diagonal movement speed so diagonal is not faster
    if (dx !== 0 && dy !== 0) {
      const length = Math.sqrt(dx * dx + dy * dy);
      dx /= length;
      dy /= length;
    }

    return { x: dx, y: dy };
  }
}

export const Input = new InputHandler();
