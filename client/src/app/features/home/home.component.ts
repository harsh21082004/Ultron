import { Component } from '@angular/core';
import { ChatComponent } from '../../shared/components/chat/chat.component';

@Component({
  selector: 'app-home-component',
  imports: [ChatComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {

}
