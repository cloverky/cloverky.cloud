import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

class Coords {
  const Coords(this.lat, this.lon);

  final double lat;
  final double lon;
}

/// 위젯이 geolocator 를 직접 부르지 않게 하는 경계. 테스트에서 가짜를 넣는다.
abstract class LocationService {
  /// 권한이 없거나 위치를 못 얻으면 null. 예외를 던지지 않는다.
  Future<Coords?> current();
}

class GeolocatorLocationService implements LocationService {
  @override
  Future<Coords?> current() async {
    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    if (permission == LocationPermission.denied ||
        permission == LocationPermission.deniedForever) {
      debugPrint('Location denied ($permission), keeping the default weather');
      return null;
    }
    try {
      // 날씨에는 대략적인 위치로 충분하다. 정밀 위치를 요구할 이유가 없다.
      // timeLimit 이 없으면 고정된 위치가 잡히지 않는 환경에서 영원히 기다린다
      // (에뮬레이터에서 실제로 그랬다). 그 사이 위젯은 로딩 상태로 잠긴다.
      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.medium,
          timeLimit: Duration(seconds: 8),
        ),
      );
      return Coords(position.latitude, position.longitude);
    } catch (error) {
      // 조용히 null 을 돌려주면 "권한 거부"와 "위치를 못 잡음"이 구분되지 않아
      // 원인을 찾을 수 없다.
      debugPrint('Could not get a position: $error');
      final last = await Geolocator.getLastKnownPosition();
      if (last != null) {
        debugPrint('Falling back to the last known position');
        return Coords(last.latitude, last.longitude);
      }
      return null;
    }
  }
}
