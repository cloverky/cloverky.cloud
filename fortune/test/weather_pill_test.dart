import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fortune/weather/location_service.dart';
import 'package:fortune/weather/weather_api.dart';
import 'package:fortune/weather/weather_pill.dart';

class FakeLocation implements LocationService {
  FakeLocation(this._position);

  final Coords? _position;

  @override
  Future<Coords?> current() async => _position;
}

class FakeApi implements WeatherApi {
  FakeApi(this._reading);

  final WeatherReading _reading;
  Coords? asked;
  bool called = false;

  @override
  Future<WeatherReading> fetch({Coords? coords}) async {
    called = true;
    asked = coords;
    return _reading;
  }
}

const _bucheon = WeatherReading(city: '부천시', tempC: 21, description: '흐림');

Future<void> _pump(WidgetTester tester, Widget child) async {
  await tester.pumpWidget(
    MaterialApp(
      home: Scaffold(body: Center(child: child)),
    ),
  );
}

void main() {
  testWidgets('처음에는 기본값을 보여준다', (tester) async {
    await _pump(
      tester,
      WeatherPill(api: FakeApi(_bucheon), location: FakeLocation(null)),
    );

    expect(find.textContaining('서울'), findsOneWidget);
  });

  testWidgets('탭하면 위치의 날씨로 바뀐다', (tester) async {
    final api = FakeApi(_bucheon);
    await _pump(
      tester,
      WeatherPill(api: api, location: FakeLocation(const Coords(37.5, 126.78))),
    );

    await tester.tap(find.byType(WeatherPill));
    await tester.pumpAndSettle();

    expect(api.asked, isNotNull);
    expect(find.textContaining('부천시'), findsOneWidget);
  });

  testWidgets('위치를 못 얻으면 조회하지 않고 기본값이 남는다', (tester) async {
    final api = FakeApi(_bucheon);
    await _pump(tester, WeatherPill(api: api, location: FakeLocation(null)));

    await tester.tap(find.byType(WeatherPill));
    await tester.pumpAndSettle();

    expect(api.called, isFalse);
    expect(find.textContaining('서울'), findsOneWidget);
  });
}
