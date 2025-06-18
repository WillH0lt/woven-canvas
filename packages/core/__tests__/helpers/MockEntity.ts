export class MockEntity {
  constructor(private components: Record<any, Record<string, any>>) {}
  read(_cls: any) {
    return this.components[_cls]
  }
  isSame(entity: MockEntity) {
    return this === entity
  }
}
