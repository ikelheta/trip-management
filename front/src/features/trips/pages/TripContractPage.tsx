import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ROUTES } from '../../../config/routes.ts'
import { useAllCompanies } from '../../companies/index.ts'
import { useAllDrivers } from '../../drivers/index.ts'
import { useFileObjectUrl, type FileObjectUrl } from '../../files/index.ts'
import { useAllVehicles } from '../../vehicles/index.ts'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { Icon } from '../../../shared/components/ui/Icon.tsx'
import { LoadingState } from '../../../shared/components/ui/LoadingState.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { ContractDocument } from '../components/contract/ContractDocument.tsx'
import { useTrip } from '../hooks/useTrips.ts'
import { tripsMessages } from '../i18n.ts'
import styles from './TripContractPage.module.css'

/**
 * Full-page print view of the trip contract (outside the app layout). The browser prints it or saves
 * it as PDF; the toolbar is not printed.
 */
export function TripContractPage() {
  const m = useMessages(tripsMessages)
  const { id = '' } = useParams()
  const trip = useTrip(id)
  const vehicles = useAllVehicles()
  const drivers = useAllDrivers()
  const companies = useAllCompanies()

  const vehicle = vehicles.data?.find((item) => item.id === trip.data?.vehicleId)
  const driver = drivers.data?.find((item) => item.id === trip.data?.driverId)
  const company = companies.data?.find((item) => item.id === vehicle?.companyId)

  const header = useFileObjectUrl(company?.headerUrl ?? null)
  const footer = useFileObjectUrl(company?.footerUrl ?? null)
  const qr = useFileObjectUrl(trip.data?.qrCodeUrl ?? null)

  const [barcodeReady, setBarcodeReady] = useState(false)
  const handleBarcodeReady = useCallback(() => setBarcodeReady(true), [])
  // Object URLs whose <img> fired load or error.
  const [settledImages, setSettledImages] = useState<ReadonlySet<string>>(new Set())
  const handleImageSettled = useCallback(
    (src: string) => setSettledImages((current) => (current.has(src) ? current : new Set(current).add(src))),
    [],
  )
  const fontsReady = useFontsReady()

  useDocumentTitle(trip.data ? m.contract.fileName(trip.data.contractNumber) : null)

  const lists = [vehicles, drivers, companies]
  if (trip.isPending || lists.some((list) => list.isPending)) {
    return (
      <div className={styles.page}>
        <LoadingState />
      </div>
    )
  }
  const failed = [trip, ...lists].find((query) => query.isError)
  if (trip.isError || failed) {
    return (
      <div className={`${styles.page} stack`}>
        <ErrorAlert error={trip.error ?? failed?.error} />
        <Link to={trip.isError ? ROUTES.trips : ROUTES.trip(id)}>{m.contract.back}</Link>
      </div>
    )
  }

  const data = trip.data
  const isSettled = (image: FileObjectUrl, hasUrl: boolean): boolean =>
    !hasUrl || image.error !== null || (image.objectUrl !== null && settledImages.has(image.objectUrl))
  const imagesReady =
    isSettled(header, Boolean(company?.headerUrl)) &&
    isSettled(footer, Boolean(company?.footerUrl)) &&
    isSettled(qr, data.qrCodeUrl !== null)
  const ready = imagesReady && barcodeReady && fontsReady
  const missingData = !vehicle || !driver || !company
  const imageFailed = [header, footer, qr].some((image) => image.error !== null)

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.actions}>
          <Link to={ROUTES.trip(data.id)} className="btn btn-secondary">
            {m.contract.back}
          </Link>
          <button type="button" className="btn btn-primary" disabled={!ready} onClick={() => window.print()}>
            <Icon name="print" /> {ready ? m.contract.print : m.contract.preparing}
          </button>
        </div>
        <p className="muted">{m.contract.hint}</p>
        {missingData && (
          <p className={styles.warning} role="status">
            {m.contract.missingData}
          </p>
        )}
        {imageFailed && (
          <p className={styles.warning} role="status">
            {m.contract.imageFailed}
          </p>
        )}
      </div>
      <div className={styles.paper}>
        <ContractDocument
          trip={data}
          company={company}
          vehicle={vehicle}
          driver={driver}
          headerImage={header.error ? null : header.objectUrl}
          footerImage={footer.error ? null : footer.objectUrl}
          qrImage={qr.error ? null : qr.objectUrl}
          onBarcodeReady={handleBarcodeReady}
          onImageSettled={handleImageSettled}
        />
      </div>
    </div>
  )
}

/** True once the contract font has loaded (printing before that would use a fallback font). */
function useFontsReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    // Ask for the font explicitly: a font face only loads once text needs it.
    document.fonts
      .load('700 16px Cairo', 'عقد')
      .then(() => document.fonts.ready)
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setReady(true)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])
  return ready
}

/** Sets the tab title (the "Save as PDF" file name) while mounted; restores the previous one after. */
function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (title === null) {
      return
    }
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])
}
