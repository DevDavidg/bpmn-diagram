import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, BehaviorSubject } from 'rxjs';
import { WorkflowData } from '../models/workflow.model';

@Injectable({
  providedIn: 'root',
})
export class WorkflowService {
  private allWorkflowsData: any = null;
  private readonly dataLoaded = new BehaviorSubject<boolean>(false);

  constructor(private readonly http: HttpClient) {
    this.loadAllWorkflows().subscribe(data => {
      this.allWorkflowsData = data;
      this.dataLoaded.next(true);
    });
  }

  private loadAllWorkflows(): Observable<any> {
    return this.http.get<any>('assets/workflow-data.json');
  }

  getSimpleWorkflowData(): Observable<WorkflowData> {
    return this.loadAllWorkflows().pipe(
      map(data => data.workflows.simple)
    );
  }

  getHeatmapWorkflowData(): Observable<WorkflowData> {
    return this.loadAllWorkflows().pipe(
      map(data => data.workflows.heatmap)
    );
  }

  getCompactWorkflowData(): Observable<WorkflowData> {
    return this.loadAllWorkflows().pipe(
      map(data => data.workflows.compact)
    );
  }

  getLinearWorkflowData(): Observable<WorkflowData> {
    return this.loadAllWorkflows().pipe(
      map(data => data.workflows.linear)
    );
  }

  getComplexWorkflowData(): Observable<WorkflowData> {
    return this.loadAllWorkflows().pipe(
      map(data => data.workflows.complex)
    );
  }

  getSimpleWorkflowDataSync(): WorkflowData | null {
    if (!this.allWorkflowsData) return null;
    return this.allWorkflowsData.workflows.simple;
  }

  getHeatmapWorkflowDataSync(): WorkflowData | null {
    if (!this.allWorkflowsData) return null;
    return this.allWorkflowsData.workflows.heatmap;
  }

  getCompactWorkflowDataSync(): WorkflowData | null {
    if (!this.allWorkflowsData) return null;
    return this.allWorkflowsData.workflows.compact;
  }

  getLinearWorkflowDataSync(): WorkflowData | null {
    if (!this.allWorkflowsData) return null;
    return this.allWorkflowsData.workflows.linear;
  }

  getComplexWorkflowDataSync(): WorkflowData | null {
    if (!this.allWorkflowsData) return null;
    return this.allWorkflowsData.workflows.complex;
  }

  isDataLoaded(): Observable<boolean> {
    return this.dataLoaded.asObservable();
  }
}
