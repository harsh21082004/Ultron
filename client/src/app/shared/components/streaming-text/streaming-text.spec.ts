import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StreamingText } from './streaming-text';

describe('StreamingText', () => {
  let component: StreamingText;
  let fixture: ComponentFixture<StreamingText>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StreamingText]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StreamingText);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
