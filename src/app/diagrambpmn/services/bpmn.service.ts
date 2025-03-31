import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class BpmnService {
  private readonly bpmnFolderPath = '/bpmn';

  constructor(private readonly http: HttpClient) {}

  getAvailableDiagrams(): Observable<string[]> {
    return this.http.get<string[]>('/api/bpmn-files').pipe(
      catchError(() => {
        const defaultBpmnFiles = [
          'Application.bpmn',
          'flightBooking.bpmn',
          'hiring.bpmn',
          'hotelBooking.bpmn',
          'travels.bpmn',
        ];
        console.warn('Usando lista de diagramas de respaldo para desarrollo');
        return of(defaultBpmnFiles);
      })
    );
  }

  loadBpmnDiagram(filename: string): Observable<string> {
    return this.http.get(`${this.bpmnFolderPath}/${filename}`, {
      responseType: 'text',
    });
  }
}
