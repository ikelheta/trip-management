import { useState } from 'react'
import { AuthImage, downloadFile } from '../../files/index.ts'
import { EmptyState } from '../../../shared/components/ui/EmptyState.tsx'
import { ErrorAlert } from '../../../shared/components/ui/ErrorAlert.tsx'
import { useMessages } from '../../../shared/i18n/messages.ts'
import { useLanguage } from '../../../shared/i18n/useLanguage.ts'
import { formatDate, formatTime } from '../../../shared/utils/formatDate.ts'
import { useRegenerateTripQrCode } from '../hooks/useTrips.ts'
import { tripsMessages } from '../i18n.ts'
import type { Trip } from '../types/trip.ts'
import styles from './TripQrCodeCard.module.css'

interface TripQrCodeCardProps {
  trip: Trip
}

export function TripQrCodeCard({ trip }: TripQrCodeCardProps) {
  const { locale } = useLanguage()
  const m = useMessages(tripsMessages)
  const regenerate = useRegenerateTripQrCode(trip.id)
  const [downloadError, setDownloadError] = useState<unknown>(null)
  const qrCodeUrl = trip.qrCodeUrl
  const title = trip.tripName ?? m.qr.fallbackTitle

  async function handleDownload(url: string): Promise<void> {
    setDownloadError(null)
    try {
      await downloadFile(url, `trip-${trip.id}-qr.png`)
    } catch (error) {
      setDownloadError(error)
    }
  }

  return (
    <section className={`card stack ${styles.card}`}>
      <h2>{m.qr.title}</h2>
      {qrCodeUrl ? (
        <>
          <div className={styles.printArea}>
            <AuthImage url={qrCodeUrl} alt={m.qr.alt(title)} className={styles.image} />
            <p className={styles.caption}>
              {m.qr.caption(title, formatDate(trip.date, locale), formatTime(trip.time))}
            </p>
          </div>
          <div className={styles.actions}>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => void handleDownload(qrCodeUrl)}>
              {m.qr.download}
            </button>
            <button type="button" className="btn btn-secondary btn-small" onClick={() => window.print()}>
              {m.qr.print}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-small"
              disabled={regenerate.isPending}
              onClick={() => regenerate.mutate()}
            >
              {regenerate.isPending ? m.qr.generating : m.qr.regenerate}
            </button>
          </div>
        </>
      ) : (
        <EmptyState message={m.qr.none}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate()}
          >
            {regenerate.isPending ? m.qr.generating : m.qr.generate}
          </button>
        </EmptyState>
      )}
      <ErrorAlert error={regenerate.error ?? downloadError} />
      <p className="alert alert-info">{m.qr.scanInfo}</p>
    </section>
  )
}
