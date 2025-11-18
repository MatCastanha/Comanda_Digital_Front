import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MenuFlutuanteComponent } from './menu-flutuante.component';

describe('MenuFlutuanteComponent', () => {
  let component: MenuFlutuanteComponent;
  let fixture: ComponentFixture<MenuFlutuanteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MenuFlutuanteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MenuFlutuanteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
