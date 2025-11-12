import { component, field } from "@lastolivegames/becsy";

import { BaseComponent } from "../BaseComponent";

@component
export class Screen extends BaseComponent {
  static singleton = true;

  @field.float64 public declare width: number;
  @field.float64 public declare height: number;

  @field.float64 public declare left: number;
  @field.float64 public declare top: number;
}
