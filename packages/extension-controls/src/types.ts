export enum ControlCommand {
  SetZoom = 'setZoom',
  MoveCamera = 'moveCamera',
}

export type ControlCommandArgs = {
  [ControlCommand.SetZoom]: [number]
  [ControlCommand.MoveCamera]: [number, number]
}
