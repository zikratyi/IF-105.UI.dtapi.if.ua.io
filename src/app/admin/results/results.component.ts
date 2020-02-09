import { Component, OnInit, ViewChild } from '@angular/core';
import { FormGroup, Validators, FormBuilder, FormControl } from '@angular/forms';
import { Group, Student } from 'src/app/shared/entity.interface';
import { Test, Results } from '../entity.interface';
import { ResultsService } from './results.service';
import { ModalService } from '../../shared/services/modal.service';
import { MatTable, MatTableDataSource, MatDialog, MatSort } from '@angular/material';
import { ResultRaitingQuestionComponent } from './result-raiting-question/result-raiting-question.component';
import { ResultDetailComponent } from './result-detail/result-detail.component';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-results',
  templateUrl: './results.component.html',
  styleUrls: ['./results.component.scss']
})

export class ResultsComponent implements OnInit {
  listGroups: Group[] = [];
  listTests: Test[] = [];
  listTestsByGroup: Test[] = [];
  listResults: Results[];
  listStudents: Student[] = [];
  searchForm: FormGroup;
  filterForm: FormGroup;
  dataSource = new MatTableDataSource<Results>();
  displayedColumns: string[] = [
    'id',
    'student',
    'result',
    'score',
    'session_date',
    'start_time',
    'duration',
    'details',
  ];

  @ViewChild(MatSort, {static: true}) sort: MatSort;

  constructor(
    private fb: FormBuilder,
    public resultsService: ResultsService,
    private modalService: ModalService,
    public dialog: MatDialog) {}

  ngOnInit() {
    this.getAllGroups();
    this.getAllTests();
    this.createFormForGetTest();
    this.onChangeFieldGroupId();
    this.createFormForFilterResult();
    this.onChangeFieldType();
  }
  /** Get all groups */
  private getAllGroups() {
    this.resultsService.getListGroup().subscribe(result => {
      this.listGroups = result;
    },  () => {
      this.modalService.openErrorModal('Помилка завантаження даних');
    });
  }
  /** Get all test */
  private getAllTests() {
    this.resultsService.getListTest().subscribe(result => {
      this.listTests = result;
      this.listTestsByGroup = this.listTests;
    },  () => {
      this.modalService.openErrorModal('Помилка завантаження даних');
    });
  }
  /** handler for change field form "groupId" */
  private onChangeFieldGroupId() {
    this.searchForm.get('group_id').valueChanges.subscribe( id => {
      this.getTestsByGroup(id);
    });
  }
  /** Get all tests for current group */
  private getTestsByGroup(id: number) {
    this.resultsService.getResultTestIdsByGroup(id).subscribe(result => {
      if (result.response) {
        this.listTestsByGroup = [];
      } else {
        this.listTestsByGroup = this.listTests.filter(item1 =>
          result.some(item2 => item2.test_id === item1.test_id )
        );
      }
    }, () => {
        this.modalService.openErrorModal('Помилка завантаження даних');
    });
  }
  /** Create form for search results by current test */
  private createFormForGetTest() {
    //this.groupId = new FormControl([this.listGroups, Validators.required]);
    this.searchForm = this.fb.group({
      group_id: [this.listGroups, Validators.required],
      test_id: [this.listTests, Validators.required],
    });
  }
  /** Get all information for current test */
  onSubmit() {
    const idGroup = this.searchForm.value.group_id;
    const idTest = this.searchForm.value.test_id;
    forkJoin(
      this.resultsService.getListStudentsBuGroup(idGroup),
      this.resultsService.getRecordsByTestGroupDate(idTest, idGroup)
    ).subscribe(([res1, res2]) => {
      if (res1 === 'no records') {
        return;
      }
      this.listStudents = res1;
      if (res2 === 'no records') {
        return;
      }
      this.listResults = res2.map( item => 
        {
          const duration = this.resultsService.getDurationTest(item.session_date, item.start_time, item.end_time);
          const score = (item.result / item.answers * 100).toFixed();
          const student = this.resultsService.getFullNameStudent(item.student_id, res1);
          return { ...item, student, duration, score};
        });
      this.dataSource.data = this.listResults;
      this.dataSource.sort = this.sort;
    }, () => {
      this.modalService.openErrorModal('Помилка завантаження даних');
    });
  }

  private createFormForFilterResult() {
  //  this.typeFilter = new FormControl(this.filterOption);
    this.filterForm = this.fb.group({
      filter_type: ['']
    });
  }

  /** handler for change field filterForm "type" */
  private onChangeFieldType() {
    this.filterForm.valueChanges.subscribe( value => {
      //this.filterOption[value](this.listResults);
      switch (value.filter_type) {
        case 1: this.dataSource.data = this.listResults;
          break;
        case 2: this.dataSource.data = this.getMaxResult(this.listResults);
          break;
        case 3: this.dataSource.data = this.getMinResult(this.listResults);
          break;
      }
      
    });
  }

  getMaxResult(list: Results[]): Results[] {
    return this.resultsService.getMaxResultStudents(list);
  }
  getMinResult(list: Results[]): Results[] {
    return this.resultsService.getMinResultStudents(list);
  }

  createChart(): void {
    this.dialog.open(ResultRaitingQuestionComponent, {
      width: '1000px',
      data: {data: this.dataSource.data}
    });
  }

  openDetailResult(detail: string): void {
    this.dialog.open(ResultDetailComponent, {
      width: '1000px',
      data: {
        detail,
      }
    });
  }
}
