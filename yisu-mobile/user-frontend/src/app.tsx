import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { Provider } from 'react-redux'
import store from './store'

function App({ children }: PropsWithChildren<any>) {
  useLaunch(() => {
    console.log('App launched.')
  })

  return (
    <Provider store={store}>
      {children}
    </Provider>
  )
}

export default App