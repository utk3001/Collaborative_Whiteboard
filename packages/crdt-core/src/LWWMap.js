export class LWWMap {
  /**
   * Initializes the CRDT Map.
   * @param {string} clientId - Unique identifier for the client (used as a tiebreaker).
   * @param {Object} initialState - Optional initial state.
   */
  constructor(clientId, initialState = {}) {
    this.clientId = clientId;
    this.state = JSON.parse(JSON.stringify(initialState)); // deep copy to prevent reference mutations
  }

  /**
   * Sets a property on a shape with a physical timestamp.
   * @param {string} shapeId - UUID of the shape.
   * @param {string} key - Property name (e.g., 'x', 'y', 'color').
   * @param {any} value - Property value.
   * @param {number} timestamp - Wall-clock timestamp (defaults to Date.now()).
   */
  set(shapeId, key, value, timestamp = Date.now()) {
    if (!this.state[shapeId]) {
      this.state[shapeId] = { data: {}, meta: {} };
    }

    const existingMeta = this.state[shapeId].meta[key];

    // Hybrid Logical Clock (HLC) behavior:
    // If the client's local physical clock is behind the highest seen timestamp for this property
    // (due to clock skew or browser fingerprinting protection like Brave's timer spoofing),
    // we artificially advance the timestamp to ensure the user's intent wins.
    let finalTimestamp = timestamp;
    if (existingMeta && finalTimestamp <= existingMeta.timestamp) {
      finalTimestamp = existingMeta.timestamp + 1;
    }

    if (
      !existingMeta ||
      finalTimestamp > existingMeta.timestamp ||
      (finalTimestamp === existingMeta.timestamp && this.clientId > existingMeta.clientId)
    ) {
      this.state[shapeId].data[key] = value;
      this.state[shapeId].meta[key] = { timestamp: finalTimestamp, clientId: this.clientId };
      return finalTimestamp;
    }
    return null;
  }

  /**
   * Marks a shape as deleted using a tombstone.
   * @param {string} shapeId - UUID of the shape to delete.
   * @param {number} timestamp - Wall-clock timestamp.
   */
  delete(shapeId, timestamp = Date.now()) {
    this.set(shapeId, '_deleted', true, timestamp);
  }

  /**
   * Returns the materialized view of the map, omitting deleted shapes.
   * @returns {Object} A clean map of { shapeId: { x, y, width... } }
   */
  get() {
    const materialized = {};
    for (const [shapeId, shape] of Object.entries(this.state)) {
      if (!shape.data._deleted) {
        materialized[shapeId] = { ...shape.data };
        delete materialized[shapeId]._deleted; // ensure internal tombstone flag doesn't leak into view
      }
    }
    return materialized;
  }

  /**
   * Merges a remote LWWMap's raw state into this one, resolving conflicts per property.
   * @param {Object} remoteState - The raw `.state` object from another LWWMap.
   */
  merge(remoteState) {
    for (const [shapeId, remoteShape] of Object.entries(remoteState)) {
      if (!this.state[shapeId]) {
        this.state[shapeId] = { data: {}, meta: {} };
      }

      for (const [key, remoteMeta] of Object.entries(remoteShape.meta)) {
        const localMeta = this.state[shapeId].meta[key];

        // LWW Resolution Rule applies during merge
        if (
          !localMeta ||
          remoteMeta.timestamp > localMeta.timestamp ||
          (remoteMeta.timestamp === localMeta.timestamp && remoteMeta.clientId > localMeta.clientId)
        ) {
          this.state[shapeId].data[key] = remoteShape.data[key];
          this.state[shapeId].meta[key] = { ...remoteMeta };
        }
      }
    }
  }
}
