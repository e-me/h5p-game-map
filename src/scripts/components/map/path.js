import Util from '@services/util.js';
import './path.scss';

/** @constant {number} MATH_TWO Two in math formulas */
const MATH_TWO = 2;

/** @constant {number} MATH_HUNDRED Hundred in math formulas */
const MATH_HUNDRED = 100;

export default class Path {
  /**
   * Construct a path.
   * @class
   * @param {object} [params] Parameters.
   */
  constructor(params = {}) {
    this.params = Util.extend({
      visuals: {
        pathWidth: '0.2'
      },
    }, params);

    this.params.state = this.params.state ??
      this.params.globals.get('states').open;

    this.params.visuals.pathWidth = parseFloat(this.params.visuals.pathWidth);

    this.dom = document.createElement('div');
    this.dom.classList.add('h5p-game-map-path');

    if (!this.params.visible) {
      this.hide();
    }
    else {
      this.show();
    }
  }

  /**
   * Get DOM.
   * @returns {HTMLElement} DOM.
   */
  getDOM() {
    return this.dom;
  }

  /**
   * Get state.
   * @returns {number} State.
   */
  getState() {
    return this.state;
  }

  /**
   * Get stage ids.
   * @returns {object} FromID and ToID of respective stages.
   */
  getStageIds() {
    return { from: this.params.fromId, to: this.params.toId };
  }

  /**
   * Determines whether path connects to a stage via stage id.
   * @param {string} stageId Stage id.
   * @returns {boolean} True, if path connects to stage.
   */
  connectsTo(stageId) {
    return this.params.fromId === stageId || this.params.toId === stageId;
  }

  /**
   * Set path reachable or unreachable.
   * @param {boolean} state If true, path is reachable. Else not.
   */
  setReachable(state) {
    if (typeof state !== 'boolean') {
      return;
    }

    this.isReachableState = state;

    if (!this.isReachable()) {
      this.hide();
    }
  }

  /**
   * @returns {boolean} True, if path is reachable. Else false.
   */
  isReachable() {
    return this.isReachableState;
  }

  /**
   * Get visibility state.
   * @returns {boolean} True, if stage is visible, else false.
   */
  isVisible() {
    return this.isVisibleState;
  }

  /**
   * Show.
   */
  show() {
    if (!this.params.globals.get('params').visual.paths.displayPaths) {
      return;
    }

    this.dom.classList.remove('display-none');
    window.requestAnimationFrame(() => {
      this.dom.classList.remove('transparent');
    });

    this.isVisibleState = true;
  }

  /**
   * Hide.
   */
  hide() {
    this.dom.classList.add('display-none');
    this.dom.classList.add('transparent');
    this.isVisibleState = false;
  }

  /**
   * Update telemetry.
   * @param {object} [params] Parameters.
   * @param {number} params.x Start position x in percent.
   * @param {number} params.y Start position y in percent.
   * @param {number} params.length length in px.
   * @param {number} params.angle Angle in radians.
   * @param {number} params.width Width in px.
   */
  update(params = {}) {
    if (typeof params.x === 'number') {
      this.dom.style.left = `${params.x}%`;
    }

    if (typeof params.y === 'number') {
      this.dom.style.top = `${params.y}%`;
    }

    if (typeof params.length === 'number') {
      this.dom.style.width = `${params.length}px`;
    }

    if (typeof params.angle === 'number') {
      this.dom.style.transform = `rotate(${params.angle}rad)`;
    }

    if (typeof params.width === 'number') {
      this.dom.style.borderTopWidth = `${params.width}px`;
    }
  }

  /**
   * Resize path.
   * @param {object} [params] Parameters.
   */
  resize(params = {}) {
    const telemetry = this.computePathTelemetry({ mapSize: params.mapSize });
    if (!telemetry) {
      return; // Resized before active
    }

    this.update({
      x: telemetry.x,
      y: telemetry.y,
      length: telemetry.length,
      angle: telemetry.angle,
      width: telemetry.width
    });
  }

  /**
   * Compute path telemetry.
   * @param {object} [params] Parameters.
   * @param {object} params.mapSize Map width and height.
   * @returns {object} Telemetry date for an path
   */
  computePathTelemetry(params = {}) {
    if (params.mapSize.height === 0 || params.mapSize.width === 0) {
      return null;
    }

    const fromX = this.params.telemetryFrom.x;
    const fromY = this.params.telemetryFrom.y;
    const fromWidth = this.params.telemetryFrom.width;
    const fromHeight = this.params.telemetryFrom.height;

    const toX = this.params.telemetryTo.x;
    const toY = this.params.telemetryTo.y;

    const fromXPx = parseFloat(fromX) / MATH_HUNDRED * params.mapSize.width;
    const fromYPx = parseFloat(fromY) / MATH_HUNDRED * params.mapSize.height;
    const toXPx = parseFloat(toX) / MATH_HUNDRED * params.mapSize.width;
    const toYPx = parseFloat(toY) / MATH_HUNDRED * params.mapSize.height;
    const width = parseFloat(fromWidth) / MATH_HUNDRED * params.mapSize.width;
    const height = parseFloat(fromHeight) / MATH_HUNDRED * params.mapSize.height;

    const deltaXPx = fromXPx - toXPx;
    const deltaYPx = fromYPx - toYPx;

    const angleOffset = (Math.sign(deltaXPx) >= 0) ? Math.PI : 0;
    const angle = Math.atan(deltaYPx / deltaXPx) + angleOffset;

    // Distance from center to border
    const offsetToBorder = {
      x: width / MATH_TWO * Math.cos(angle) *
        MATH_HUNDRED / params.mapSize.width,
      y: height / MATH_TWO * Math.sin(angle) *
        MATH_HUNDRED / params.mapSize.height
    };

    // Border width
    const strokeWidth = Math.min(
      Math.max(Path.MIN_WIDTH_PX, width * this.params.visuals.pathWidth),
      width * Path.MAX_FACTOR
    );

    const offsetPathStroke =
      strokeWidth / MATH_TWO * MATH_HUNDRED / params.mapSize.height;

    // Position + offset for centering + offset for border (+ stroke offset)
    const x = parseFloat(fromX) +
      parseFloat(fromWidth) / MATH_TWO +
      offsetToBorder.x;

    const y = parseFloat(fromY) +
      parseFloat(fromHeight) / MATH_TWO +
      offsetToBorder.y -
      offsetPathStroke;

    // Good old Pythagoras
    const length = Math.sqrt(
      Math.abs(deltaXPx) * Math.abs(deltaXPx) +
      Math.abs(deltaYPx) * Math.abs(deltaYPx)
    ) - width; // assuming circle for hotspot

    return { x, y, length, angle, width: strokeWidth };
  }

  /**
   * Reset.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.isInitial] If true, don't overwrite presets.
   */
  reset(params = {}) {
    this.setReachable(true);

    const state = params.isInitial ?
      this.params.state :
      this.params.globals.get('states').open;

    this.setState(state);

    if (params.isInitial && this.params.visible) {
      this.show();
    }
    else {
      this.hide();
    }
  }

  /**
   * Set path state.
   * @param {number|string} state State constant.
   * @param {object} [params] Parameters.
   * @param {boolean} [params.force] If true, will set state unconditionally.
   */
  setState(state, params = {}) {
    const states = this.params.globals.get('states');

    if (typeof state === 'string') {
      state = Object.entries(states)
        .find((entry) => entry[0] === state)[1];
    }

    if (typeof state !== 'number') {
      return;
    }

    let newState;

    if (params.force) {
      newState = states[state];
    }
    else if (state === states.open) {
      newState = states.open;
    }
    else if (state === states.cleared) {
      newState = states.cleared;
    }

    if (!this.state || this.state !== newState) {
      this.state = newState;

      for (const [key, value] of Object.entries(states)) {
        if (value !== this.state) {
          this.dom.classList.remove(`h5p-game-map-path-${key}`);
        }
        else {
          this.dom.classList.add(`h5p-game-map-path-${key}`);
        }
      }
    }
  }
}

/** @constant {number} Path.MIN_WIDTH_PX Path minimum width in px */
Path.MIN_WIDTH_PX = 1;

/** @constant {number} Path.MAX_FACTOR Path max size factor, % of stage size */
Path.MAX_FACTOR = 0.3;
