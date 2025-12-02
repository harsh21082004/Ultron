import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchChat } from './search-chat.component';

describe('SearchChat', () => {
  let component: SearchChat;
  let fixture: ComponentFixture<SearchChat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchChat]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchChat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
