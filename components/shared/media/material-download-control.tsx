'use client'

import { DownloadButton, type DownloadButtonProps } from '@/components/shared/media/download-button'

type Props = Omit<DownloadButtonProps, 'onDownload'> & { materialId?: string }

export function MaterialDownloadControl({ materialId, ...props }: Props) {
  const handleDownload = async (): Promise<void> => {
    if (materialId) {
      console.log('Downloading material:', materialId)
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 650))
  }

  return <DownloadButton {...props} onDownload={handleDownload} />
}
