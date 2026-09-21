class Greeter {
  void greet({required String name}) {
    print('Hello ${name}');
  }
}

void Main() {
  String name = 2;
  Greeter().greet(name: 'sasf');
}
