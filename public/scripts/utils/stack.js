const StateList = function () {
  const states = [];
  this.pop = () => {
    return states.pop();
  };
  this.push = (state) => {
    states.push(state);
  };
  this.top = () => {
    return states[states.length - 1];
  };
};

const EmptyState = function () {
  this.update = () => {};
  this.render = () => {};
  this.onEnter = () => {};
  this.onExit = () => {};

  // Optional but useful
  this.onPause = () => {};
  this.onResume = () => {};
};

const StateStack = function () {
  const states = new StateList();
  states.push(new EmptyState());
  this.update = (delta) => {
    const state = states.top();
    if (state) {
      state.update(delta);
    }
  };
  this.render = () => {
    const state = states.top();
    if (state) {
      state.render();
    }
  };
  this.push = (state) => {
    states.push(state);
    state.onEnter();
  };
  this.pop = () => {
    const state = states.top();
    if (state.onExit) {
      state.onExit();
    }
    return states.pop();
  };

  this.pause = () => {
    var state = states.top();
    if (state.onPause) {
      state.onPause();
    }
  };

  this.resume = () => {
    var state = states.top();
    if (state.onResume) {
      state.onResume();
    }
  };

  this.top = () => {
    return states.top();
  };
};

export default StateStack;
