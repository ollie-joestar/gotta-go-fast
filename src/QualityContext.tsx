import { createContext, useContext } from 'react'

export type QualityPreset = 'low' | 'high'

export const QualityContext = createContext<QualityPreset>('low')

export const useQuality = () => useContext(QualityContext)
