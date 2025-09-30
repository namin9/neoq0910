export interface GeoPoint {
  latitude: number
  longitude: number
}

export interface TransitLocation extends GeoPoint {
  name: string
  code: string
  city: string
  address?: string
}

export interface TrainStation extends TransitLocation {
  lines: string[]
  opened?: number
}

export interface BusTerminal extends TransitLocation {
  routes: string[]
  platforms?: number
}

export type TransitDataSet = {
  trainStations: TrainStation[]
  busTerminals: BusTerminal[]
}
