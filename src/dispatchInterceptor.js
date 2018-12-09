const typeToInterceptor = new Map();

const addInterceptor = (interceptType, interceptor, interceptInThunks = false) => {
  if (typeof interceptType !== "string" || interceptType === "") {
    throw new Error("interceptType must be a non-empty string");
  }
  if (typeToInterceptor.has(interceptType)) {
    throw new Error("A dispatch interceptor of type '" + interceptType + "' is already registered");
  }
  if (typeof interceptor !== "function") {
    throw new Error("interceptor of type '" + interceptType + "' must be a synchronous callback, but got '" + typeof interceptor + "'");
  }
  typeToInterceptor.set(interceptType, {interceptor, interceptInThunks});
  return {
    removeInterceptor: () => {
      typeToInterceptor.delete(interceptType);
    },
  }
};

const getInterceptEnhancer = () => next => (...args) => {
  const store = next(...args); // eslint-disable-line callback-return
  const getState = store.getState;
  const reduxDispatch = store.dispatch;

  let enhancedDispatch = null;

  const handleDispatch = (action, {noIntercept, noInterceptTypes, onDispatchHandledCallback, isFromThunk}, dispatchArgIndex, ...restArgs) => {
    const dispatchTimestamp = Date.now();
    const skipTypes = typeof noInterceptTypes === "string" ? new Set([noInterceptTypes]) : new Set(noInterceptTypes);
    let blockedBy = null;
    typeToInterceptor.forEach(({interceptor, interceptInThunks}, interceptType) => {
      if (blockedBy === null) {
        if (!isFromThunk || interceptInThunks) {
          if (!noIntercept && !skipTypes.has(interceptType)) {
            let interceptResult = null;
            interceptResult = interceptor({
              action,
              dispatch: enhancedDispatch,
              getState,
              dispatchTimestamp,
            }, ...restArgs);
            if (typeof interceptResult !== "boolean") {
              // We cannot allow for async interceptors, because redux users
              // expect the dispatch function to work synchronously.
              throw new Error("interceptor of type'" + interceptType + "' returned no boolean");
            }
            if (interceptResult === false) {
              blockedBy = interceptType;
            }
          }
        }
      }
    });
    if (blockedBy === null) {
      if (typeof action === "function") {
        if (dispatchArgIndex === null) {
          action(enhancedDispatch, getState, ...restArgs, {
            noIntercept,
            noInterceptTypes,
            onDispatchHandledCallback,
            isFromThunk: true,
          });
        }
        else {
          restArgs[dispatchArgIndex].isFromThunk = true; // eslint-disable-line no-param-reassign
          action(enhancedDispatch, getState, ...restArgs);
        }
      }
      else {
        reduxDispatch(action, ...restArgs);
      }
      if (typeof onDispatchHandledCallback === "function") {
        onDispatchHandledCallback({
          blocked: false,
          blockedBy,
        })
      }

      // It's not possible to give another dispatch to promise middleware -> thus dispatch interceptor is not
      // compatible with redux-promise-middleware. We could make it work, by wrapping the promises in the payload,
      // but there could also be payloads with a promise without promise middleware being used.
    }
    else if (typeof onDispatchHandledCallback === "function") {
      onDispatchHandledCallback({
        blocked: true,
        blockedBy,
      })
    }
  };

  enhancedDispatch = (action, ...dispatchArgs) => {
    let dispatchArg = {
      noIntercept: false,
      noInterceptTypes: null,
      onDispatchHandledCallback: null,
      isFromThunk: false,
    };
    let dispatchArgIndex = null;
    for (let i = 0; i < dispatchArgs.length; ++i) {
      if (typeof dispatchArgs[i] === "object" && (
            typeof dispatchArgs[i].noIntercept === "boolean" ||
            typeof dispatchArgs[i].noInterceptTypes === "string" ||
            Array.isArray(dispatchArgs[i].noInterceptTypes) ||
            typeof dispatchArgs[i].onDispatchHandledCallback === "function" ||
            typeof dispatchArgs[i].isFromThunk === "boolean"
          )) {
        dispatchArg = dispatchArgs[i];
        break;
      }
    }
    handleDispatch(action, dispatchArg, dispatchArgIndex, ...dispatchArgs);
  };

  return {
    ...store,
    dispatch: enhancedDispatch,
  };
};

export {
  getInterceptEnhancer,
  addInterceptor,
};
