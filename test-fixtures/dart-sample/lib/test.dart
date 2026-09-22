class Greeter {
  String greet(String s, {required String name}) {
    print('Hello ${name}');
    return 2;
  }
}

void Main() {
  String patate = 1;
  Greeter().greet(name: name);
}
