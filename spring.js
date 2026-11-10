// @ts-check

class Spring2D {
  /**
   * @param {number} startX - Initial X position of the mass
   * @param {number} startY - Initial Y position of the mass
   * @param {number} stiffness - Spring constant (higher = stiffer/faster)
   * @param {number} damping - Friction (higher = settles faster, less bouncy)
   * @param {number} mass - Mass of the object (default is 1)
   */
  constructor(startX = 0, startY = 0, stiffness = 150, damping = 15, mass = 1) {
    // Current position of the trailing end (the mass)
    this.x = startX;
    this.y = startY;

    // Current velocity
    this.vx = 0;
    this.vy = 0;

    // Physical properties
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
  }

  /**
   * Advances the simulation by one step.
   * 
   * @param {number} targetX - The current X position of the input/anchor
   * @param {number} targetY - The current Y position of the input/anchor
   * @param {number} dt - Delta time in seconds (e.g., 0.016 for 60fps)
   * @returns {{x: number, y: number}} The new position of the spring's mass
   */
  step(targetX, targetY, dt) {
    if (dt <= 0) return { x: this.x, y: this.y };

    // 1. Calculate the distance to the target
    const dx = targetX - this.x;
    const dy = targetY - this.y;

    // 2. Calculate spring force (Hooke's Law: F = k * displacement)
    const springForceX = dx * this.stiffness;
    const springForceY = dy * this.stiffness;

    // 3. Calculate damping force (F = -c * velocity)
    const dampingForceX = -this.damping * this.vx;
    const dampingForceY = -this.damping * this.vy;

    // 4. Calculate total acceleration (a = F / m)
    const ax = (springForceX + dampingForceX) / this.mass;
    const ay = (springForceY + dampingForceY) / this.mass;

    // 5. Semi-implicit Euler integration
    // (Update velocity first, then use the new velocity to update position)
    this.vx += ax * dt;
    this.vy += ay * dt;

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    return { x: this.x, y: this.y };
  }

  /**
   * Instantly snaps the spring to a specific position and stops all momentum.
   *
   * @param {number} x
   * @param {number} y
   */
  teleport(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
  }
}
