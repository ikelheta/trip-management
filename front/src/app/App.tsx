import { RouterProvider } from 'react-router'
import { AppProviders } from './providers/AppProviders.tsx'
import { router } from './routes/router.tsx'

function App() {
  return (
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  )
}

export default App
