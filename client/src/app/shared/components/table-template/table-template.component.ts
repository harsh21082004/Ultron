import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';

export interface TableData {
  title?: string;
  headers: string[];
  rows: any[]; // array of objects where keys are headers
}

@Component({
  selector: 'app-table-template-component',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule],
  templateUrl: './table-template.component.html',
  styleUrl: './table-template.component.scss'
})
export class TableTemplateComponent implements OnChanges {
  @Input() data!: TableData;
  displayedColumns: string[] = []; 

  ngOnChanges(): void {
    this.displayedColumns = (this.data && this.data.headers) ? [...this.data.headers] : [];
  }
}
