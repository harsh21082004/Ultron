import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CitationButton } from './citation-button';

describe('CitationButton', () => {
  let component: CitationButton;
  let fixture: ComponentFixture<CitationButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CitationButton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CitationButton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
