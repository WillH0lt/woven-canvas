export const bringForwardButton = {
  tag: 'ic-bring-forward-button',
  tooltip: 'Bring Forward',
}

export const sendBackwardButton = {
  tag: 'ic-send-backward-button',
  tooltip: 'Send Backward',
}

export const duplicateButton = {
  tag: 'ic-duplicate-button',
  tooltip: 'Duplicate',
}

export const deleteButton = {
  tag: 'ic-delete-button',
  tooltip: 'Delete',
}

export const dividerElement = {
  tag: 'ic-divider',
  width: 8.75,
}

const standardButtonSet = [bringForwardButton, sendBackwardButton, duplicateButton, deleteButton]

export const defaultFloatingMenus = [
  {
    blockKind: 'group',
    buttons: standardButtonSet,
  },
  {
    blockKind: 'ic-shape',
    buttons: standardButtonSet,
  },
  {
    blockKind: 'ic-text',
    buttons: standardButtonSet,
  },
]
