import { createBrowserRouter, Navigate } from 'react-router'
import { ROUTES } from '../../config/routes.ts'
import { AccountPage, ChangePasswordPage, LoginPage, RequireAuth } from '../../features/authentication/index.ts'
import {
  CompaniesPage,
  CompanyDetailsPage,
  EditCompanyPage,
  NewCompanyPage,
} from '../../features/companies/index.ts'
import { CountriesPage } from '../../features/countries/index.ts'
import { DriversPage, EditDriverPage, NewDriverPage } from '../../features/drivers/index.ts'
import { InspectionChecklistPage } from '../../features/inspection-checklist/index.ts'
import {
  CreateTripPage,
  EditTripPage,
  TripContractPage,
  TripDetailsPage,
  TripsListPage,
} from '../../features/trips/index.ts'
import { EditUserPage, NewUserPage, UsersPage } from '../../features/users/index.ts'
import { EditVehiclePage, NewVehiclePage, VehiclesPage } from '../../features/vehicles/index.ts'
import { AppLayout } from '../layout/AppLayout.tsx'
import { NotFoundPage } from '../pages/NotFoundPage.tsx'
import { RouteErrorPage } from '../pages/RouteErrorPage.tsx'

export const router = createBrowserRouter([
  { path: ROUTES.login, element: <LoginPage />, errorElement: <RouteErrorPage /> },
  {
    element: <RequireAuth />,
    errorElement: <RouteErrorPage />,
    children: [
      // Full-page print view: no sidebar or top bar.
      { path: '/trips/:id/contract', element: <TripContractPage /> },
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Navigate to={ROUTES.trips} replace /> },
          { path: ROUTES.account, element: <AccountPage /> },
          { path: ROUTES.changePassword, element: <ChangePasswordPage /> },
          // Feature routes go here.
          { path: ROUTES.users, element: <UsersPage /> },
          { path: ROUTES.newUser, element: <NewUserPage /> },
          { path: '/users/:id/edit', element: <EditUserPage /> },
          { path: ROUTES.companies, element: <CompaniesPage /> },
          { path: ROUTES.newCompany, element: <NewCompanyPage /> },
          { path: '/companies/:id', element: <CompanyDetailsPage /> },
          { path: '/companies/:id/edit', element: <EditCompanyPage /> },
          { path: ROUTES.countries, element: <CountriesPage /> },
          { path: ROUTES.vehicles, element: <VehiclesPage /> },
          { path: ROUTES.newVehicle, element: <NewVehiclePage /> },
          { path: '/vehicles/:id/edit', element: <EditVehiclePage /> },
          { path: ROUTES.drivers, element: <DriversPage /> },
          { path: ROUTES.newDriver, element: <NewDriverPage /> },
          { path: '/drivers/:id/edit', element: <EditDriverPage /> },
          { path: ROUTES.inspectionChecklist, element: <InspectionChecklistPage /> },
          { path: ROUTES.trips, element: <TripsListPage /> },
          { path: ROUTES.newTrip, element: <CreateTripPage /> },
          { path: '/trips/:id', element: <TripDetailsPage /> },
          { path: '/trips/:id/edit', element: <EditTripPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
])
