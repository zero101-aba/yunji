let pending = null;

export default {
  set(payload) {
    pending = payload;
  },
  take() {
    const value = pending;
    pending = null;
    return value;
  }
};
