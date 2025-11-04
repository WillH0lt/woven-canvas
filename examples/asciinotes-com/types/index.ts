export interface Profile {
  uid: string;
  email: string;
  photoUrl: string;
}

export interface SelectionItem {
  text: string;
  key: string;
}

export interface MenuItem {
  text: string;
  loading?: boolean;
  onClick: () => void;
}

export interface DialogButton {
  text: string;
  onClick: () => void;
}

export enum ModalView {
  None = 'None',
  Login = 'Login',
  Signup = 'Signup',
}

export enum GiphySearchMode {
  Gif = 'gifs',
  Sticker = 'stickers',
}

export enum SubmenuKind {
  None = 'None',
  Crayon = 'Crayon',
  Marker = 'Marker',
}

export enum Alignment {
  Left = 'left',
  Center = 'center',
  Right = 'right',
  Justify = 'justify',
}

export enum SideMenuKind {
  None = 'None',
  Effects = 'Effects',
  LinkStyles = 'LinkStyles',
}

export interface StickerPack {
  title: string;
  author: string;
  directory: string;
  stickers: string[];
}
