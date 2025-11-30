import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RemovePopupComponent } from './remove-popup.component';

describe('RemovePopupComponent', () => {
  let component: RemovePopupComponent;
  let fixture: ComponentFixture<RemovePopupComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RemovePopupComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RemovePopupComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
