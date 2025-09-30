import trainStationsSource from '@data/train_stations.json'
import busTerminalsSource from '@data/bus_terminals.json'

import type { TrainStation, BusTerminal, TransitDataSet } from '../types/transit'

export const trainStations = trainStationsSource as TrainStation[]
export const busTerminals = busTerminalsSource as BusTerminal[]

export const transitData: TransitDataSet = {
  trainStations,
  busTerminals
}

export type { TrainStation, BusTerminal }
