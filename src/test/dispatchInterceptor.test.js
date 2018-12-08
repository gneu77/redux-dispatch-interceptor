/* eslint-disable no-magic-number */

import {combineReducers, createStore} from "redux";
import {getInterceptEnhancer} from "../dispatchInterceptor";

const RESET_STATE = 0;

const TYPE_INCREASE_A = "TYPE_INCREASE_A";
const TYPE_INCREASE_B = "TYPE_INCREASE_B";
const TYPE_RESET = "TYPE_RESET";

const reducerA = (state = {
  count: RESET_STATE,
}, action) => {
  if (action.type === TYPE_INCREASE_A) {
    return {count: state.count + 1};
  }
  else if (action.type === TYPE_RESET) {
    return {count: RESET_STATE};
  }
  else {
    return state;
  }
};

const reducerB = (state = {
  count: RESET_STATE,
}, action) => {
  if (action.type === TYPE_INCREASE_B) {
    return {count: state.count + 1};
  }
  else if (action.type === TYPE_RESET) {
    return {count: RESET_STATE};
  }
  else {
    return state;
  }
};

let reduxStore = null;
let onReduxStateChange = null;
beforeAll(() => {
  // setup a redux store for testing:
  const reducers = combineReducers({
    reducerA,
    reducerB,
  });
  const enhancer = getInterceptEnhancer();
  reduxStore = createStore(reducers, {}, enhancer);

  // now we need a listener:
  reduxStore.subscribe(() => {
    onReduxStateChange(reduxStore.getState);
  });
});


describe("dispatch", () => {

  it("has standard redux behavior", () => {
    let countA = null;
    let countB = null;
    onReduxStateChange = getState => {
      countA = getState().reducerA.count;
      countB = getState().reducerB.count;
    };

    reduxStore.dispatch({type: TYPE_INCREASE_A});
    expect(countA).toEqual(1);
    expect(countB).toEqual(0);

    reduxStore.dispatch({type: TYPE_INCREASE_B});
    expect(countA).toEqual(1);
    expect(countB).toEqual(1);

    reduxStore.dispatch({type: TYPE_RESET});
    expect(countA).toEqual(0);
    expect(countB).toEqual(0);
  });

  it("handles standard redux thunks", () => {
    let countA = null;
    let countB = null;
    onReduxStateChange = getState => {
      countA = getState().reducerA.count;
      countB = getState().reducerB.count;
    };

    reduxStore.dispatch(dispatch => {
      dispatch({type: TYPE_INCREASE_A});
      dispatch({type: TYPE_INCREASE_B});
    });
    expect(countA).toEqual(1);
    expect(countB).toEqual(1);

    reduxStore.dispatch({type: TYPE_RESET});
    expect(countA).toEqual(0);
    expect(countB).toEqual(0);
  });


  it("handles redux thunks with extra dispatch arguments", () => {
    let countA = null;
    let countB = null;
    let countC = null;
    onReduxStateChange = getState => {
      countA = getState().reducerA.count;
      countB = getState().reducerB.count;
    };

    reduxStore.dispatch((dispatch, getState, extraArgument) => {
      dispatch({type: TYPE_INCREASE_A});
      dispatch({type: TYPE_INCREASE_B});
      countC = extraArgument;
    });
    expect(countA).toEqual(1);
    expect(countB).toEqual(1);
    expect(typeof countC).toEqual("undefined");

    reduxStore.dispatch((dispatch, getState, extraArgument) => {
      dispatch({type: TYPE_INCREASE_B});
      countC = extraArgument;
    }, 7);
    expect(countA).toEqual(1);
    expect(countB).toEqual(2);
    expect(countC).toEqual(7);

    reduxStore.dispatch({type: TYPE_RESET});
    expect(countA).toEqual(0);
    expect(countB).toEqual(0);
  });

});
