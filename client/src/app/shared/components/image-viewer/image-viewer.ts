import { Component, Input, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm transition-opacity duration-300"
         [@fadeInOut] (click)="closeViewer()">
      
      <div class="absolute top-4 right-4 flex items-center gap-3 z-[10000]" (click)="$event.stopPropagation()">
        
        <button mat-icon-button (click)="zoomOut()" matTooltip="Zoom Out" class="!text-white hover:bg-white/10 rounded-full">
          <mat-icon>remove</mat-icon>
        </button>
        
        <button mat-icon-button (click)="resetZoom()" matTooltip="Reset" class="!text-white hover:bg-white/10 rounded-full">
          <mat-icon>restart_alt</mat-icon>
        </button>
        
        <button mat-icon-button (click)="zoomIn()" matTooltip="Zoom In" class="!text-white hover:bg-white/10 rounded-full">
          <mat-icon>add</mat-icon>
        </button>

        <div class="w-[1px] h-6 bg-white/20 mx-1"></div>

        <button mat-icon-button (click)="downloadImage()" matTooltip="Download" class="!text-white hover:bg-white/10 rounded-full">
          <mat-icon>download</mat-icon>
        </button>

        <button mat-icon-button (click)="closeViewer()" matTooltip="Close" class="!text-white hover:bg-red-500/20 hover:text-red-400 rounded-full">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <div class="relative w-full h-full flex items-center justify-center p-4 overflow-hidden" (wheel)="onWheel($event)">
        <img [src]="imageUrl" 
             class="max-w-full max-h-full object-contain transition-transform duration-200 ease-out cursor-move select-none shadow-2xl rounded-sm"
             [style.transform]="'scale(' + zoomLevel + ') translate(' + panX + 'px, ' + panY + 'px)'"
             (click)="$event.stopPropagation()"
             (mousedown)="startPan($event)"
             draggable="false"
             alt="Full preview">
      </div>

      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-1 rounded-full text-white text-xs font-mono backdrop-blur-md border border-white/10 pointer-events-none">
        {{ Math.round(zoomLevel * 100) }}%
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
  `],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class ImageViewerComponent {
  @Input({ required: true }) imageUrl!: string;
  @Output() close = new EventEmitter<void>();

  zoomLevel = 1;
  panX = 0;
  panY = 0;
  isDragging = false;
  startX = 0;
  startY = 0;
  
  protected Math = Math; // For template usage

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeViewer();
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    this.isDragging = false;
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isDragging) return;
    event.preventDefault();
    // Adjust sensitivity based on zoom to prevent wild movements
    const sensitivity = 1 / this.zoomLevel; 
    this.panX += event.movementX * sensitivity;
    this.panY += event.movementY * sensitivity;
  }

  startPan(event: MouseEvent) {
    if (this.zoomLevel > 1) {
        this.isDragging = true;
        this.startX = event.clientX - this.panX;
        this.startY = event.clientY - this.panY;
    }
  }

  onWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    this.adjustZoom(delta);
  }

  zoomIn() { this.adjustZoom(0.25); }
  zoomOut() { this.adjustZoom(-0.25); }
  
  resetZoom() {
    this.zoomLevel = 1;
    this.panX = 0;
    this.panY = 0;
  }

  private adjustZoom(delta: number) {
    const newZoom = this.zoomLevel + delta;
    if (newZoom >= 0.5 && newZoom <= 5) {
      this.zoomLevel = newZoom;
      if (this.zoomLevel === 1) {
          this.panX = 0; 
          this.panY = 0;
      }
    }
  }

  downloadImage() {
    const a = document.createElement('a');
    a.href = this.imageUrl;
    a.download = `image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  closeViewer() {
    this.close.emit();
  }
}