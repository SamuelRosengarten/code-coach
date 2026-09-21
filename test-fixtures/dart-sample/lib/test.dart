class Greeter {
  String greet(String s, {required String name}) {
    print('Hello ${name}');
    return 2;
  }
}

void Main(){
  String s =2;
  Greeter().greet(s, name: name);
  
}
