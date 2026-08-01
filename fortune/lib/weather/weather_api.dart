import 'dart:convert';

import 'package:http/http.dart' as http;

import 'location_service.dart';

class WeatherReading {
  const WeatherReading({
    required this.city,
    required this.tempC,
    required this.description,
  });

  final String city;
  final double tempC;
  final String description;
}

abstract class WeatherApi {
  Future<WeatherReading> fetch({Coords? coords});
}

class HttpWeatherApi implements WeatherApi {
  HttpWeatherApi({http.Client? client}) : _client = client ?? http.Client();

  final http.Client _client;

  /// 로컬 백엔드로 돌리려면 --dart-define=API_BASE_URL=http://10.0.2.2:8000
  static const String _baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.cloverky.cloud',
  );

  @override
  Future<WeatherReading> fetch({Coords? coords}) async {
    final uri = Uri.parse('$_baseUrl/weather').replace(
      queryParameters: coords == null
          ? null
          : {'lat': '${coords.lat}', 'lon': '${coords.lon}'},
    );
    final response = await _client.get(uri);
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    return WeatherReading(
      city: data['city'] as String,
      tempC: (data['temp_c'] as num).toDouble(),
      description: data['description'] as String,
    );
  }
}
