import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareDialog } from './share-dialog';

describe('ShareDialog', () => {
  let component: ShareDialog;
  let fixture: ComponentFixture<ShareDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShareDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShareDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
