# redux-dispatch-interceptor
A redux enhancer to add arbitrary dispatch interceptors:
* Intercept calls to dispatch
    * Decorate actions
    * Replace actions
    * Block actions
    * Dispatch something else prior to action
* Can be seen as kind of dynamic middleware
* Also replaces thunk middleware (with same functionality)
* No dependencies

## Table of Contents
1. [Installation](#section-installation)
2. [Usage](#section-usage)
3. [Use Case Example](#section-use-case)
4. [Quality](#section-quality)
5. [Questions](#section-questions)

## Installation <a name="section-installation"></a>
```javascript
npm install --save @swarmy/redux-dispatch-interceptor
```

## Usage <a name="section-usage"></a>
### Store Setup
Assuming you are already using some middleware:
```javascript
import {getInterceptEnhancer} from "@swarmy/redux-dispatch-interceptor";

...
const enhancer = compose(
    applayMiddleware(createLogger()),
    getInterceptEnhancer(),
);
const store = createStore(reducers, initialState, enhancer);
```
* If you want to intercept dispatches before any other enhancer gets the chance to do something, then the intercept enhancer must be the last argument to compose.
* If other enhancers are implemented correctly and pass additional dispatch arguments to the next one, then it should be no problem, if the intercept enhancer is not the last one.

### Adding Interceptors
```javascript
import {addInterceptor} from "@swarmy/redux-dispatch-interceptor";

const interceptorHandle = addInterceptor("myInterceptor", ({
    action,
    dispatch,
    getState,
    dispatchTimestamp,
}) => {
    ...
    return isProceedWithDispatch;
});
```
* The returned `interceptorHandle` can be used to remove the interceptor.
* The first argument is the name/identifier of the interceptor
    * It must be unique, hence trying to add a second interceptor with the same name will throw an error.
* The second argument is a callback that must return a boolean.
    * If `true`, the intercepted dispatch will proceed, else, it is blocked
    * The callback gets an object with `action`, `dispatch`, `getState` and the `dispatchTimestamp`.
* Interceptors are called in the order they were added
    * As soon as one interceptor returns false, the dispatch is blocked without calling the remaining interceptors.
* There is an optional third argument which defaults to false.
    * If false, the interceptor will not be called for actions dispatched from a thunk (it will only be called for the thunk itself)
    * If true, each action will be intercepted, also those coming from a thunk

### Removing Interceptors
```javascript
interceptorHandle.removeInterceptor();
```

### Optional Dispatch Argument
* You can pass an object impacting the intercept behavior as additional argument to dispatch.
* If you have additional enhancers in your application that use additional dispatch arguments, this is no problem. The interceptor enhancer will just remove the interceptor object before it passes over to the next enhancer.
    * However, if your other enhancer is not doing the same, then the interceptor enhancer should be the last one in your compose.

#### Do not intercept dispatch by any interceptor:
```javascript
dispatch(myAction, {noIntercept: true});
```

#### Do not intercept dispatch by certain interceptors:
```javascript
dispatch(myAction, {noInterceptTypes: ["myInterceptor", "anotherInterceptor"]});
```

#### Get informed, when a dispatch was handled:
```javascript
dispatch(myAction, {
    onDispatchHandledCallback: ({blocked, blockedBy, isFromThunk}) => {
        if (blocked) {
            console.log("The dispatch was blocked by interceptor ", blockedBy);
        }
        else {
            console.log("Dispatch finished");
        }
        if (isFromThunk) {
            console.log("myAction was a thunk, so onDispatchHandledCallback might be called multiple times");
        }
    }
});
```

## Use Case Example <a name="section-use-case"></a>
Many possible use-cases could be handled via thunk middleware with similar effort.
I will thus only give an example that could be handled by thunks only in an unsatisfying way.

Suppose the following common situation:
* There is a bunch of actions a user can trigger via buttons, menus, checkboxes, navigation, ect.
* When you are in edit mode for a certain entity, there are actions you want to allow without asking for confirmation:
    * E.g. click on Save, Cancel or Undo
* There is however a huge amount of action, where you want to ask the user for confirmation, because they would lead to him loosing his unsaved modifications.

For the developer implementing an edit form, it is easy to say which actions he wants to allow without confirmation.
However, he might to want to have to think about all the actions he would have to wrap in a thunk with a conditional check if they are allowed without confirmation or not.
Even if he would do so, another developer might implement a new action some time later and might not be aware that he has to add a corresponding check.
In this situation, it would be much better to have a whitelist-logic instead of blacklist-logic.
Hence, by default block ask for confirmation for all actions while there are unsaved changes and have a simple mechanism to whitelist actions, if you find they would not mess around with your edit mode.

1. As soon as there are unsaved changes:
```javascript
const handle = addInterceptor("confirmationInterceptor", ({
    action,
    dispatch,
}) => {
    showConfirmationPopup({
        onConfirmed: () => {
            dispatch(action, {noInterceptTypes: "confirmationInterceptor"});
        }
    });
    return false;
});
```

2. As soon as there are no longer unsaved changes:
```javascript
const handle.removeInterceptor();
```

3. If an action should not ask for confirmation:
```javascript
dispatch({type: "SAVE_CHANGES", payload: data}, {noInterceptTypes: "confirmationInterceptor"});
```

That's it. If you would do this with thunks instead, you would have to warp all of your actions into thunks.

## Quality <a name="section-quality"></a>
* [Test results](https://rawcdn.githack.com/gneu77/redux-dispatch-interceptor/408ee25424b9aec960ea890a914297054892a5f8/test-report.html)
* [Test coverage](https://rawcdn.githack.com/gneu77/redux-dispatch-interceptor/408ee25424b9aec960ea890a914297054892a5f8/coverage/index.html)

## Questions <a name="section-questions"></a>

### Why can I not use async functions as intercept callback?
Because it would break redux standard behavior.
If not dispatching a thunk, users expect that their call to dispatch is handled in the same event loop as the code following the dispatch.
Code relying on this would break in case of an async interceptor.
Thus, this package only allows for synchronous interceptors.
Of course, by dispatching a thunk from an interceptor and blocking the original action, you could still achieve the same behavior, but if you see need for this, you should probably think twice about your design.

### Can I not do all of this with thunk middleware?
Yes you can!
And I'd say in 90% of the use cases, that's the better way, because it's the standard way.
To get an idea in which cases an interceptor might be more handy, have a look at the example in the [Use Case Example](#section-use-case)
