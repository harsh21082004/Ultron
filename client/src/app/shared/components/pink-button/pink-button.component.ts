import { Component, EventEmitter, Input, Output, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
@Component({
  selector: 'app-pink-button-component',
  templateUrl: './pink-button.component.html',
  styleUrl: './pink-button.component.scss',
  imports: [MatButtonModule, MatDividerModule, MatIconModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class PinkButtonComponent {
  @Input() type: 'submit' | 'button' | 'reset' = 'button';

  @Input() width: number = 0;

  @Input() height: number = 0;

  @Input() borderRadius: number = 0;

  @Input() fontSize: number = 0;

  @Input() disabled: boolean = false;


  /**
   * @Output() creates an event emitter. The parent component can listen for this event.
   * We are naming it 'buttonClick' to be descriptive.
   * Example: <app-pink-button (buttonClick)="myLoginFunction($event)">...</app-pink-button>
   */
  @Output() buttonClick = new EventEmitter<MouseEvent>();

  /**
   * This internal method is called when the button's native click event fires.
   * It then emits our custom 'buttonClick' event, passing the original MouseEvent payload.
   * This allows the parent component to receive the full event details if needed.
   * @param event The original MouseEvent from the button click.
   */
  onButtonClick(event: MouseEvent): void {
    this.buttonClick.emit(event);
  }
}
