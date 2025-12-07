import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChatEmptyState } from './chat-empty-state';

describe('ChatEmptyState', () => {
  let component: ChatEmptyState;
  let fixture: ComponentFixture<ChatEmptyState>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatEmptyState]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChatEmptyState);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
