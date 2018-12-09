/* eslint-disable no-magic-number */

import {combineReducers, createStore} from "redux";
import {getInterceptEnhancer, addInterceptor} from "../dispatchInterceptor";

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


describe("enhanced dispatch", () => {

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
    expect(countC.isFromThunk).toBeTruthy();

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

  it("throws error when trying to register interceptor without type", () => {
    expect(() => {
      addInterceptor("", () => true);
    }).toThrow("interceptType must be a non-empty string");
  });

  it("throws error when trying to register two interceptors of the same type", () => {
    const interceptorHandle = addInterceptor("INTERCEPTOR_A", () => true);
    expect(() => {
      addInterceptor("INTERCEPTOR_A", () => true);
    }).toThrow("A dispatch interceptor of type 'INTERCEPTOR_A' is already registered");
    interceptorHandle.removeInterceptor();
  });

  it("throws error when interceptor is no function", () => {
    expect(() => {
      addInterceptor("INTERCEPTOR_A", {});
    }).toThrow("interceptor of type 'INTERCEPTOR_A' must be a synchronous callback, but got 'object'");
  });

  it("throws error when interceptor returns no boolean", () => {
    const interceptorHandle = addInterceptor("INTERCEPTOR_A", () => "I am no boolean");
    expect(() => {
      reduxStore.dispatch({type: TYPE_INCREASE_A});
    }).toThrow("interceptor of type'INTERCEPTOR_A' returned no boolean");
    interceptorHandle.removeInterceptor();
  });

  it("calls registered interceptors with action, getState, dipatch timestamp and additional dispatch args", () => {
    let interceptAction = null;
    let lastTimestamp = 1;
    let currentTimestamp = lastTimestamp;
    let interceptCountA = null;
    let interceptCountB = null;
    let additionalArg1 = null;
    let additionalArg2 = null;
    const interceptorHandle = addInterceptor("INTERCEPTOR_A", ({
      action,
      getState,
      dispatchTimestamp,
    }, arg1, arg2) => {
      interceptAction = action;
      lastTimestamp = currentTimestamp;
      currentTimestamp = dispatchTimestamp;
      interceptCountA = getState().reducerA.count;
      interceptCountB = getState().reducerB.count;
      additionalArg1 = arg1;
      additionalArg2 = arg2;
      return true;
    });

    let countA = null;
    let countB = null;
    onReduxStateChange = getState => {
      countA = getState().reducerA.count;
      countB = getState().reducerB.count;
    };

    reduxStore.dispatch({type: TYPE_INCREASE_A}, "x", "y");
    expect(countA).toEqual(1);
    expect(countB).toEqual(0);
    expect(interceptAction.type).toEqual(TYPE_INCREASE_A);
    expect(lastTimestamp < currentTimestamp).toBeTruthy();
    expect(interceptCountA).toEqual(0);
    expect(interceptCountB).toEqual(0);
    expect(additionalArg1).toEqual("x");
    expect(additionalArg2).toEqual("y");

    interceptorHandle.removeInterceptor();
    reduxStore.dispatch({type: TYPE_RESET});
    expect(countA).toEqual(0);
    expect(countB).toEqual(0);
  });

  it("blocks dispatch in case any interceptor returns false", () => {
    const interceptorHandle = addInterceptor("INTERCEPTOR_A", () => false);

    let countA = null;
    let countB = null;
    onReduxStateChange = getState => {
      countA = getState().reducerA.count;
      countB = getState().reducerB.count;
    };

    reduxStore.dispatch({type: TYPE_INCREASE_A});
    reduxStore.dispatch({type: TYPE_INCREASE_B});
    expect(countA).toEqual(null);
    expect(countB).toEqual(null);

    interceptorHandle.removeInterceptor();
  });

  it("does not block dispatches with noIntercept in additional dispatch-object", () => {
    const interceptorHandleA = addInterceptor("INTERCEPTOR_A", () => false);
    const interceptorHandleB = addInterceptor("INTERCEPTOR_B", () => false);

    let countA = null;
    let countB = null;
    onReduxStateChange = getState => {
      countA = getState().reducerA.count;
      countB = getState().reducerB.count;
    };

    reduxStore.dispatch({type: TYPE_INCREASE_A}, {noIntercept: true});
    reduxStore.dispatch({type: TYPE_INCREASE_B});
    expect(countA).toEqual(1);
    expect(countB).toEqual(0);

    interceptorHandleA.removeInterceptor();
    interceptorHandleB.removeInterceptor();
    reduxStore.dispatch({type: TYPE_RESET});
    expect(countA).toEqual(0);
    expect(countB).toEqual(0);
  });

  it("does not block dispatches with corresponding noInterceptTypes string in dispatch-object", () => {
    const interceptorHandleA = addInterceptor("INTERCEPTOR_A", () => false);

    let countA = null;
    let countB = null;
    onReduxStateChange = getState => {
      countA = getState().reducerA.count;
      countB = getState().reducerB.count;
    };

    reduxStore.dispatch({type: TYPE_INCREASE_A}, {noInterceptTypes: "INTERCEPTOR_A"});
    reduxStore.dispatch({type: TYPE_INCREASE_B});
    expect(countA).toEqual(1);
    expect(countB).toEqual(0);

    interceptorHandleA.removeInterceptor();
    reduxStore.dispatch({type: TYPE_RESET});
    expect(countA).toEqual(0);
    expect(countB).toEqual(0);
  });

  it("does not block dispatches with corresponding noInterceptTypes array in dispatch-object", () => {
    const interceptorHandleA = addInterceptor("INTERCEPTOR_A", () => false);
    const interceptorHandleB = addInterceptor("INTERCEPTOR_B", () => false);

    let countA = null;
    let countB = null;
    onReduxStateChange = getState => {
      countA = getState().reducerA.count;
      countB = getState().reducerB.count;
    };

    reduxStore.dispatch({type: TYPE_INCREASE_A}, {noInterceptTypes: ["INTERCEPTOR_A"]});
    reduxStore.dispatch({type: TYPE_INCREASE_B}, {noInterceptTypes: ["INTERCEPTOR_A", "INTERCEPTOR_B"]});
    expect(countA).toEqual(0);
    expect(countB).toEqual(1);

    interceptorHandleA.removeInterceptor();
    interceptorHandleB.removeInterceptor();
    reduxStore.dispatch({type: TYPE_RESET});
    expect(countA).toEqual(0);
    expect(countB).toEqual(0);
  });

  it("does not block dispatches with corresponding noInterceptTypes array in dispatch-object", () => {
    const interceptorHandleA = addInterceptor("INTERCEPTOR_A", () => false);
    const interceptorHandleB = addInterceptor("INTERCEPTOR_B", () => false);

    let countA = null;
    let countB = null;
    onReduxStateChange = getState => {
      countA = getState().reducerA.count;
      countB = getState().reducerB.count;
    };

    reduxStore.dispatch({type: TYPE_INCREASE_A}, {noInterceptTypes: ["INTERCEPTOR_A"]});
    reduxStore.dispatch({type: TYPE_INCREASE_B}, {noInterceptTypes: ["INTERCEPTOR_A", "INTERCEPTOR_B"]});
    expect(countA).toEqual(0);
    expect(countB).toEqual(1);

    interceptorHandleA.removeInterceptor();
    interceptorHandleB.removeInterceptor();
    reduxStore.dispatch({type: TYPE_RESET});
    expect(countA).toEqual(0);
    expect(countB).toEqual(0);
  });

  it("notifies about finished dispatch with intercept info", () => {
    const interceptorHandleA = addInterceptor("INTERCEPTOR_A", () => true);
    const interceptorHandleB = addInterceptor("INTERCEPTOR_B", () => false);

    let countA = null;
    let countB = null;
    onReduxStateChange = getState => {
      countA = getState().reducerA.count;
      countB = getState().reducerB.count;
    };

    let localBlockedBy = null;
    reduxStore.dispatch({type: TYPE_INCREASE_A}, {
      onDispatchHandledCallback: ({blocked, blockedBy}) => {
        if (blocked) {
          localBlockedBy = blockedBy;
        }
        expect(countA).toEqual(null);
        expect(countB).toEqual(null);
      },
    });
    expect(localBlockedBy).toEqual("INTERCEPTOR_B");
    expect(countA).toEqual(null);
    expect(countB).toEqual(null);

    reduxStore.dispatch({type: TYPE_INCREASE_B}, {
      onDispatchHandledCallback: ({blocked, blockedBy}) => {
        countA = 7;
        expect(blocked).toBeFalsy();
        expect(blockedBy).toEqual(null);
      },
      noIntercept: true,
    });
    expect(countA).toEqual(7);
    expect(countB).toEqual(1);

    interceptorHandleA.removeInterceptor();
    interceptorHandleB.removeInterceptor();
    reduxStore.dispatch({type: TYPE_RESET});
    expect(countA).toEqual(0);
    expect(countB).toEqual(0);
  });

  it("allows to dispatch from interceptor", () => {
    const interceptorHandleA = addInterceptor("INTERCEPTOR_A", () => {
      reduxStore.dispatch({type: TYPE_INCREASE_B}, {noIntercept: true});
      return false;
    });

    let countA = null;
    let countB = null;
    onReduxStateChange = getState => {
      countA = getState().reducerA.count;
      countB = getState().reducerB.count;
    };

    reduxStore.dispatch({type: TYPE_INCREASE_A});
    expect(countA).toEqual(0);
    expect(countB).toEqual(1);

    interceptorHandleA.removeInterceptor();
    reduxStore.dispatch({type: TYPE_RESET});
    expect(countA).toEqual(0);
    expect(countB).toEqual(0);
  });

});
