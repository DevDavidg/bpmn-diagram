import {
  Component,
  Input,
  ElementRef,
  HostListener,
  AfterViewInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { WorkflowNode, NODE_CONFIG } from '../../models/workflow.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-workflow-node',
  standalone: true,
  imports: [CommonModule],
  host: {
    '[style.position]': '"absolute"',
    '[style.z-index]': 'zIndex',
    '[attr.data-node-id]': 'node.id',
  },
  template: `
    <div
      class="tags-container"
      [style.width.px]="nodeWidth + 20"
      *ngIf="hasTags()"
    >
      <ng-container *ngIf="showIncidents && node.incidents !== undefined">
        <div class="tag tag-incidents">⚠️ {{ node.incidents }} Incidents</div>
      </ng-container>

      <ng-container *ngIf="showTime && node.time !== undefined">
        <div class="tag tag-time">⏰ {{ formatTime(node.time) }} sec.</div>
      </ng-container>

      <ng-container *ngIf="showInstances && node.instances !== undefined">
        <div class="tag tag-instances">📦 {{ node.instances }} Instances</div>
      </ng-container>
    </div>
    <div
      class="node"
      [ngClass]="node.type"
      [attr.data-node-id]="node.id"
      [style.border-color]="node.color"
      [style.width.px]="nodeWidth"
      [style.min-height.px]="nodeHeight"
      (click)="showNodeDetails($event)"
    >
      <div
        class="heatmap-overlay"
        *ngIf="hasPeso()"
        [style.background]="getHeatmapGradient()"
      ></div>
      <div class="node-content">
        <div class="node-type">{{ getNodeTypeLabel() }}</div>
        <div class="node-text">{{ node.text }}</div>
        <div
          class="peso-indicator"
          *ngIf="hasPeso()"
          [style.--peso-opacity]="(node.peso ?? 0) / 10"
        >
          {{ formatPeso(node.peso ?? 0) }}
        </div>
        <div class="node-details" *ngIf="hasDetails()">
          <span class="details-toggle">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        position: absolute;
      }
      .node {
        position: relative;
        border-radius: 5px;
        padding: 10px;
        color: white;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
        display: flex;
        flex-direction: column;
        transition: transform 0.2s, box-shadow 0.2s;
        cursor: pointer;
        border: 2px solid transparent;
        background-color: white;
        overflow: hidden;
      }
      .heatmap-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        opacity: 0.7;
        z-index: 1;
        pointer-events: none;
      }
      .node-content {
        position: relative;
        z-index: 2;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        width: 100%;
      }
      .peso-indicator {
        font-size: 0.8em;
        margin-top: 5px;
        padding: 2px 6px;
        border-radius: 10px;
        background-color: rgba(255, 255, 255, 0.8);
        color: #333;
        font-weight: bold;
      }
      .peso-indicator::before {
        content: '';
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: rgba(255, 0, 0, var(--peso-opacity));
        margin-right: 4px;
      }
      .node:hover {
        transform: translateY(-3px);
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }
      .decision:hover {
        transform: rotate(45deg);
      }
      .decision {
        position: relative;
        transform: rotate(45deg);
        border-radius: 0;
        width: 100px;
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: white;
        border: 2px solid transparent;
      }
      .decision .node-content {
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
        width: 100%;
        height: 100%;
      }
      .decision .heatmap-overlay {
        transform: rotate(0deg);
      }
      .node-type {
        font-size: 0.8em;
        text-transform: uppercase;
        margin-bottom: 5px;
        opacity: 0.9;
        color: black;
      }
      .node-text {
        font-weight: bold;
        word-break: break-word;
        color: #333;
      }
      .node-details {
        margin-top: 5px;
        font-size: 0.8em;
      }
      .details-toggle {
        display: flex;
        align-items: center;
        justify-content: center;

        color: #666;
      }
      .start,
      .end {
        border-radius: 30px;
      }
      .task {
        border-radius: 5px;
      }
      .tooltip-container {
        position: fixed;
        width: 300px;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        z-index: 9999999;
        overflow: hidden;
        animation: tooltip-fade-in 0.2s ease-out;
        pointer-events: auto;
      }
      @keyframes tooltip-fade-in {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .tooltip-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 15px;
        background-color: #f5f5f5;
        border-bottom: 1px solid #e0e0e0;
      }
      .tooltip-title {
        font-weight: bold;
        font-size: 16px;
        color: #333;
      }
      .tooltip-close {
        background: none;
        border: none;
        font-size: 16px;
        cursor: pointer;
        color: #666;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
      }
      .tooltip-close:hover {
        background-color: #eaeaea;
        color: #333;
      }
      .tooltip-content {
        max-height: 350px;
        overflow-y: auto;
        padding: 15px;
      }
      .tooltip-section {
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid #f0f0f0;
      }
      .tooltip-section:last-child {
        margin-bottom: 0;
        padding-bottom: 0;
        border-bottom: none;
      }
      .tooltip-section-title {
        font-size: 12px;
        text-transform: uppercase;
        font-weight: 600;
        color: #666;
        margin-bottom: 4px;
      }
      .tooltip-section-value {
        font-size: 14px;
        color: #333;
        word-break: break-word;
      }

      .tags-container {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-start;
        gap: 4px;
        margin-bottom: 5px;
        top: -72px;
        height: 60px;
        position: absolute;
        align-items: flex-end;
      }
      .tag {
        font-size: 0.7em;
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 4px;
        color: white;
      }

      .tag-incidents {
        background-color: #a83232;
      }
      .tag-time {
        background-color: #28a745;
      }
      .tag-instances {
        background-color: #6c757d;
      }
    `,
  ],
})
export class NodeComponent implements AfterViewInit, OnChanges {
  @Input() node!: WorkflowNode;
  @Input() showIncidents = false;
  @Input() showTime = false;
  @Input() showInstances = false;

  nodeWidth = NODE_CONFIG.width;
  nodeHeight = NODE_CONFIG.height;
  zIndex = NODE_CONFIG.zIndex + 10;
  tooltipVisible = false;
  tooltipX = 0;
  tooltipY = 0;

  formatTime(ms: number): number {
    return Math.round(ms / 1000);
  }

  hasTags(): boolean {
    return (
      (this.showIncidents && this.node.incidents !== undefined) ||
      (this.showTime && this.node.time !== undefined) ||
      (this.showInstances && this.node.instances !== undefined)
    );
  }
  private readonly excludedProperties = [
    'id',
    'type',
    'text',
    'x',
    'y',
    'color',
    'input',
    'output',
  ];

  constructor(private readonly elementRef: ElementRef) {}
  ngAfterViewInit(): void {}

  ngOnChanges(changes: SimpleChanges): void {}

  getNodeTypeLabel(): string {
    const typeLabels: Record<string, string> = {
      start: 'Inicio',
      end: 'Fin',
      task: 'Tarea',
      decision: 'Decisión',
    };
    return typeLabels[this.node.type] || this.node.type;
  }

  hasPeso(): boolean {
    return (
      this.node.hasOwnProperty('peso') && typeof this.node.peso === 'number'
    );
  }

  formatPeso(peso: number): string {
    return `${peso.toFixed(1)}/10`;
  }

  getHeatmapGradient(): string {
    const value = Math.max(0, Math.min(10, this.node.peso ?? 0)) / 10;

    return `rgba(255, 0, 0, ${value})`;
  }

  hasDetails(): boolean {
    return Object.keys(this.node).some(
      (key) => !this.excludedProperties.includes(key)
    );
  }

  displayableProperties(): { key: string; value: any }[] {
    return Object.entries(this.node)
      .filter(([key]) => !this.excludedProperties.includes(key))
      .map(([key, value]) => ({ key, value }));
  }

  private tooltipElement: HTMLElement | null = null;

  showNodeDetails(event: MouseEvent): void {
    event.stopPropagation();
    if (this.tooltipElement) {
      this.closeTooltip();
    }
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'global-tooltip';
    this.tooltipElement.style.position = 'fixed';
    this.tooltipElement.style.zIndex = '999999';
    this.tooltipElement.style.width = '300px';
    this.tooltipElement.style.backgroundColor = 'white';
    this.tooltipElement.style.borderRadius = '8px';
    this.tooltipElement.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.2)';
    this.tooltipElement.style.overflow = 'hidden';
    this.tooltipElement.style.animation = 'tooltip-fade-in 0.2s ease-out';
    let leftPos = event.clientX + 15;
    let topPos = event.clientY;
    const tooltipHTML = `
      <style>
        @keyframes tooltip-fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .tooltip-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 15px;
          background-color: #f5f5f5;
          border-bottom: 1px solid #e0e0e0;
        }
        .tooltip-title {
          font-weight: bold;
          font-size: 16px;
          color: #333;
        }
        .tooltip-close {
          background: none;
          border: none;
          font-size: 16px;
          cursor: pointer;
          color: #666;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
        }
        .tooltip-close:hover {
          background-color: #eaeaea;
          color: #333;
        }
        .tooltip-content {
          max-height: 350px;
          overflow-y: auto;
          padding: 15px;
        }
        .tooltip-section {
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f0f0f0;
        }
        .tooltip-section:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        .tooltip-section-title {
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
          color: #666;
          margin-bottom: 4px;
        }
        .tooltip-section-value {
          font-size: 14px;
          color: #333;
          word-break: break-word;
        }
        .peso-indicator-large {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 12px;
          font-weight: bold;
          color: white;
          background-color: ${this.getPesoColor()};
        }
      </style>
      <div class="tooltip-header">
        <span class="tooltip-title">${this.node.text}</span>
        <button class="tooltip-close" id="close-tooltip">✕</button>
      </div>
      <div class="tooltip-content">
        <div class="tooltip-section">
          <div class="tooltip-section-title">Type</div>
          <div class="tooltip-section-value">${this.getNodeTypeLabel()}</div>
        </div>
        ${
          this.hasPeso()
            ? `
        <div class="tooltip-section">
          <div class="tooltip-section-title">Peso</div>
          <div class="tooltip-section-value">
            <span class="peso-indicator-large">${this.formatPeso(
              this.node.peso ?? 0
            )}</span>
          </div>
        </div>
        `
            : ''
        }
        ${this.displayableProperties()
          .filter((prop) => prop.key !== 'peso')
          .map(
            (prop) => `
            <div class="tooltip-section">
              <div class="tooltip-section-title">${this.formatPropertyName(
                prop.key
              )}</div>
              <div class="tooltip-section-value">${prop.value}</div>
            </div>
          `
          )
          .join('')}
      </div>
    `;
    this.tooltipElement.innerHTML = tooltipHTML;
    document.body.appendChild(this.tooltipElement);
    const tooltipRect = this.tooltipElement.getBoundingClientRect();
    if (event.clientX + tooltipRect.width + 15 > window.innerWidth) {
      leftPos = event.clientX - tooltipRect.width - 15;
    }
    if (event.clientY + tooltipRect.height > window.innerHeight) {
      topPos = event.clientY - tooltipRect.height - 15;
    }
    this.tooltipElement.style.left = `${leftPos}px`;
    this.tooltipElement.style.top = `${topPos}px`;
    const closeButton = this.tooltipElement.querySelector('#close-tooltip');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeTooltip();
      });
    }
    setTimeout(() => {
      document.addEventListener('click', this.handleDocumentClick);
    }, 0);
  }

  getPesoColor(): string {
    const value = Math.max(0, Math.min(10, this.node.peso ?? 0)) / 10;

    const opacity = 0.3 + value * 0.7;
    return `rgba(255, 0, 0, ${opacity})`;
  }

  private readonly handleDocumentClick = (e: MouseEvent) => {
    if (
      this.tooltipElement &&
      !this.tooltipElement.contains(e.target as Node) &&
      !this.elementRef.nativeElement.contains(e.target as Node)
    ) {
      this.closeTooltip();
    }
  };

  closeTooltip(): void {
    if (this.tooltipElement?.parentNode) {
      this.tooltipElement.parentNode.removeChild(this.tooltipElement);
      this.tooltipElement = null;
      document.removeEventListener('click', this.handleDocumentClick);
    }
  }

  @HostListener('window:keydown.escape')
  onEscapeKey(): void {
    if (this.tooltipElement) {
      this.closeTooltip();
    }
  }

  ngOnDestroy(): void {
    this.closeTooltip();
  }

  formatPropertyName(name: string): string {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([a-zA-Z])(\d)/g, '$1 $2');
  }
}
