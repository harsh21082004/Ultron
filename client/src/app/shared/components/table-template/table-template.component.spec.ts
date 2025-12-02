import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TableTemplate } from './table-template.component';

describe('TableTemplate', () => {
  let component: TableTemplate;
  let fixture: ComponentFixture<TableTemplate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableTemplate]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TableTemplate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
