// import React from 'react';
// import { Observable } from 'rxjs';
// import config from 'recompose/rxjsObservableConfig';
// import {
//   setObservableConfig,
//   componentFromStream
// } from 'recompose';

// setObservableConfig(config);

// // class App extends Component {
// //   render() {
// //     return (
// //       <div className="App">
// //         <p className="App-intro">
// //           Hello World
// //         </p>
// //       </div>
// //     );
// //   }
// // }

// const App = componentFromStream(props$ => {
//   return Observable.interval(1000).map(i => (
//     <div>{i}</div>
//   ));
// });

// export default App;
import React from "react"
import { render } from "react-dom"
import { Observable } from "rxjs"
import config from "recompose/rxjsObservableConfig"
import {
  setObservableConfig,
  componentFromStream
} from "recompose"

setObservableConfig(config)

const App = componentFromStream(props$ => {
  return Observable.interval(1000).map(i => (
    <div>{i}</div>
  ))
})

export default App;
