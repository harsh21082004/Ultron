import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ContentRenderer } from './content-renderer.component';

describe('ContentRenderer', () => {
  let component: ContentRenderer;
  let fixture: ComponentFixture<ContentRenderer>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentRenderer]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ContentRenderer);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
