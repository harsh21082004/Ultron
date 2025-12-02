import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CodeEditorCanvas } from './code-editor-canvas.component';

describe('CodeEditorCanvas', () => {
  let component: CodeEditorCanvas;
  let fixture: ComponentFixture<CodeEditorCanvas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CodeEditorCanvas]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CodeEditorCanvas);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
