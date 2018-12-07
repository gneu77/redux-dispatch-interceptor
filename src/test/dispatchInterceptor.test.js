import {combineReducers, createStore} from "redux";
import {getInterceptEnhancer} from "../dispatchInterceptor";

const STATE_A = "state A";
const STATE_B = "state B";

const TYPE_CHANGE_ONE = "TYPE_CHANGE_ONE";
const TYPE_CHANGE_TWO = "TYPE_CHANGE_TWO";

const reducerOne = (state = {
  state: STATE_A,
}, action) => {
  if (action.type === TYPE_CHANGE_ONE) {
    return {...state, state: STATE_B};
  }
  else {
    return state;
  }
};

const reducerTwo = (state = {
  state: STATE_A,
}, action) => {
  if (action.type === TYPE_CHANGE_TWO) {
    return {...state, state: STATE_B};
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
    reducerOne,
    reducerTwo,
  });
  const middleware = getInterceptEnhancer();
  reduxStore = createStore(reducers, {}, middleware);

  // now we need a listener:
  reduxStore.subscribe(() => {
    onReduxStateChange(reduxStore.getState);
  });
});


describe("dispatch", () => {

  it("has standard redux behavior", () => {
    onReduxStateChange = getState => {
      console.log("Reducer One: ", getState().reducerOne);
      console.log("Reducer Two: ", getState().reducerTwo);
    };

    console.log("Dispatching " + TYPE_CHANGE_ONE);
    reduxStore.dispatch({type: TYPE_CHANGE_ONE});

    console.log("Dispatching " + TYPE_CHANGE_TWO);
    reduxStore.dispatch({type: TYPE_CHANGE_TWO});
  });

  it("handles standard redux thunks", () => {
    onReduxStateChange = getState => {
      console.log("Reducer One: ", getState().reducerOne);
      console.log("Reducer Two: ", getState().reducerTwo);
    };

    reduxStore.dispatch(dispatch => {
      console.log("Dispatching " + TYPE_CHANGE_ONE);
      dispatch({type: TYPE_CHANGE_ONE});

      console.log("Dispatching " + TYPE_CHANGE_TWO);
      dispatch({type: TYPE_CHANGE_TWO});
    });
  });

});
